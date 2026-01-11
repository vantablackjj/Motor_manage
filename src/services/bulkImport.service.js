const { pool } = require("../config/database");
const { from: copyFrom } = require("pg-copy-streams");
const ExcelJS = require("exceljs");
const fs = require("fs");
const { Readable } = require("stream");
const logger = require("../ultils/logger");

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
        ", "
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
   */
  static async safeImport(filePath, tableName, mapping) {
    const startTime = Date.now();
    let totalRows = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const batchSize = 1000;
    let currentBatch = [];

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      entries: "emit",
      sharedStrings: "cache",
      styles: "cache",
    });

    try {
      for await (const worksheetReader of workbookReader) {
        if (worksheetReader.id === 1 || worksheetReader.name) {
          for await (const row of worksheetReader) {
            if (row.number === 1) continue; // Skip header
            totalRows++;

            try {
              const rowData = {};
              const rowErrors = [];

              mapping.forEach((m, index) => {
                const cellValue = row.getCell(index + 1).value;

                // Chạy validator nếu có
                if (m.validator) {
                  const valResult = m.validator(cellValue);
                  if (valResult.error) {
                    rowErrors.push(`${m.dbCol}: ${valResult.error}`);
                  }
                }

                rowData[m.dbCol] = cellValue;
              });

              if (rowErrors.length > 0) {
                throw new Error(rowErrors.join("; "));
              }

              currentBatch.push(rowData);

              if (currentBatch.length >= batchSize) {
                await this._insertBatch(tableName, currentBatch);
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
        await this._insertBatch(tableName, currentBatch);
        successCount += currentBatch.length;
      }

      const duration = (Date.now() - startTime) / 1000;
      return {
        totalRows,
        successCount,
        errorCount,
        errors,
        duration,
      };
    } catch (error) {
      logger.error(`SAFE Import failed for ${tableName}`, error);
      throw error;
    }
  }

  /**
   * Helper để insert batch dữ liệu
   */
  static async _insertBatch(tableName, dataArray) {
    if (dataArray.length === 0) return;

    const columns = Object.keys(dataArray[0]);
    const values = [];
    const valuePlaceholders = [];

    dataArray.forEach((row, i) => {
      const rowPlaceholders = [];
      columns.forEach((col) => {
        values.push(row[col]);
        rowPlaceholders.push(`$${values.length}`);
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(", ")})`);
    });

    const query = `INSERT INTO ${tableName} (${columns.join(
      ", "
    )}) VALUES ${valuePlaceholders.join(", ")}`;

    await pool.query(query, values);
  }
}

module.exports = BulkImportService;
