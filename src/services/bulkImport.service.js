const { pool } = require("../config/database");
const { from: copyFrom } = require("pg-copy-streams");
const ExcelJS = require("exceljs");
const fs = require("fs");
const { Readable } = require("stream");
const logger = require("../utils/logger");

class BulkImportService {
  /**
   * FAST IMPORT: Sử dụng PostgreSQL COPY command cho tốc độ tối đa
   * @param {string} filePath - Đường dẫn file CSV
   * @param {string} tableName - Tên bảng đích
   * @param {Array<string>} columns - Danh sách các cột
   */
  static async fastImport(filePath, tableName, columns) {
    const startTime = Date.now();
    const client = await pool.connect();

    try {
      const copyQuery = `COPY ${tableName} (${columns.join(
        ", ",
      )}) FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')`;

      const stream = client.query(copyFrom(copyQuery));
      const fileStream = fs.createReadStream(filePath);

      const importPromise = new Promise((resolve, reject) => {
        stream.on("finish", () => {
          const duration = (Date.now() - startTime) / 1000;
          resolve({ duration });
        });
        stream.on("error", (err) => {
          logger.error(`Error in FAST COPY stream for ${tableName}`, err);
          reject(err);
        });
        fileStream.on("error", (err) => {
          logger.error(`Error reading file for FAST import: ${filePath}`, err);
          reject(err);
        });
      });

      fileStream.pipe(stream);

      const { duration } = await importPromise;

      // Đếm số dòng sau khi import (vì COPY không trả về số dòng trực tiếp qua stream dễ dàng)
      // Lưu ý: Trong thực tế có thể dùng log của Postgres hoặc đếm sơ bộ từ file.
      // Ở đây ta trả về duration và coi như thành công nếu không throw.
      return {
        success: true,
        totalRows: "N/A (Check DB)",
        duration,
      };
    } catch (error) {
      logger.error(`FAST Import failed for ${tableName}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * SAFE IMPORT: Đọc stream, validate từng dòng, hỗ trợ partial success
   * @param {string} filePath - Đường dẫn file Excel
   * @param {string} tableName - Tên bảng đích
   * @param {Array<object>} mapping - [{ excelCol, dbCol, validator }]
   * @param {object} constants - { dbCol: value } for all rows
   * @param {function} transformer - (rowData) => transformedRowData
   */
  static async safeImport(
    filePath,
    tableName,
    mapping,
    constants = {},
    transformer = null,
    options = { upsert: true, conflictCol: null },
  ) {
    const startTime = Date.now();
    let totalRows = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const batchSize = 500; // Tăng lên 500 để tối ưu throughput
    let currentBatch = [];

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      entries: "emit",
      sharedStrings: "cache", // Sử dụng cache để resolved cell values chính xác
      styles: "ignore", // Bỏ qua style để tăng tốc
    });

    try {
      for await (const worksheetReader of workbookReader) {
        if (worksheetReader.id === 1 || worksheetReader.name) {
          for await (const row of worksheetReader) {
            if (row.number === 1) continue; // Skip header

            try {
              const rowData = {};
              const rowErrors = [];
              let isRowEmpty = true;

              mapping.forEach((m, index) => {
                let cellValue = row.getCell(index + 1).value;

                // Xử lý nếu cell là object (công thức, RichText...)
                if (cellValue && typeof cellValue === "object") {
                  if (cellValue.result !== undefined)
                    cellValue = cellValue.result;
                  else if (cellValue.text !== undefined)
                    cellValue = cellValue.text;
                  else if (cellValue.richText) {
                    cellValue = cellValue.richText.map((t) => t.text).join("");
                  }
                }

                if (
                  cellValue !== null &&
                  cellValue !== undefined &&
                  cellValue !== ""
                ) {
                  isRowEmpty = false;
                }

                // Chạy validator nếu có
                if (m.validator) {
                  const valResult = m.validator(cellValue);
                  if (valResult.error) {
                    rowErrors.push(`${m.dbCol}: ${valResult.error}`);
                  }
                }

                rowData[m.dbCol] = cellValue;
              });

              if (isRowEmpty) continue; // Bỏ qua dòng hoàn toàn trống
              totalRows++;

              // Log tiến độ ra terminal để debug
              if (totalRows % 100 === 0) {
                logger.info(`Đang import ${tableName}: Dòng ${totalRows}...`);
              }

              if (rowErrors.length > 0) {
                throw new Error(rowErrors.join("; "));
              }

              // Merge constant values
              Object.assign(rowData, constants);

              // Apply transformation
              let finalRowData = rowData;
              if (typeof transformer === "function") {
                finalRowData = transformer(rowData);
                if (!finalRowData) {
                  totalRows--;
                  continue;
                }
              }

              currentBatch.push(finalRowData);

              if (currentBatch.length >= batchSize) {
                await this._insertBatch(tableName, currentBatch, options);
                successCount += currentBatch.length;
                currentBatch = [];
              }
            } catch (err) {
              errorCount++;
              errors.push({
                row: row.number,
                message: err.message,
              });
            }
          }
        }
      }

      // Insert nốt batch cuối
      if (currentBatch.length > 0) {
        try {
          await this._insertBatch(tableName, currentBatch, options);
          successCount += currentBatch.length;
        } catch (err) {
          errorCount += currentBatch.length;
          errors.push({
            row: "Final Batch",
            message: `Lỗi ghi dữ liệu: ${err.message}`,
          });
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      return {
        totalRows,
        successCount,
        errorCount,
        errors: errors.slice(0, 50), // Chỉ trả về 50 lỗi đầu tiên
        duration,
      };
    } catch (error) {
      logger.error(`SAFE Import failed for ${tableName}`, error);
      throw error;
    }
  }

  /**
   * Helper để insert batch dữ liệu với hỗ trợ UPSERT
   */
  static async _insertBatch(tableName, dataArray, options = {}) {
    if (dataArray.length === 0) return;

    const columns = Object.keys(dataArray[0]);
    const values = [];
    const valuePlaceholders = [];

    dataArray.forEach((row) => {
      const rowPlaceholders = [];
      columns.forEach((col) => {
        values.push(row[col]);
        rowPlaceholders.push(`$${values.length}`);
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(", ")})`);
    });

    let query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES ${valuePlaceholders.join(", ")}`;

    // Xử lý UPSERT nếu có yêu cầu
    if (options.upsert && options.conflictCol) {
      const updateSet = columns
        .filter((col) => col !== options.conflictCol && col !== "id")
        .map((col) => `${col} = EXCLUDED.${col}`)
        .join(", ");

      if (updateSet) {
        query += ` ON CONFLICT (${options.conflictCol}) DO UPDATE SET ${updateSet}`;
      } else {
        query += ` ON CONFLICT (${options.conflictCol}) DO NOTHING`;
      }
    }

    await pool.query(query, values);
  }
}

module.exports = BulkImportService;
