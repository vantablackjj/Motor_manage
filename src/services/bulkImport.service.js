const { pool } = require("../config/database");
const { from: copyFrom } = require("pg-copy-streams");
const ExcelJS = require("exceljs");
const { Readable } = require("stream");
const logger = require("../ultils/logger");

class BulkImportService {
  /**
   * Import dữ liệu từ Excel vào một bảng chỉ định sử dụng COPY command của PostgreSQL
   * @param {string} filePath - Đường dẫn file excel
   * @param {string} tableName - Tên bảng đích
   * @param {Array<string>} columns - Danh sách các cột trong DB theo thứ tự trong Excel (bỏ qua header)
   */
  static async importExcelToTable(filePath, tableName, columns) {
    const startTime = Date.now();
    let rowCount = 0;

    const client = await pool.connect();

    try {
      // 1. Tạo câu lệnh COPY
      // Dùng CSV format với delimiter là tab (\t) hoặc comma (,)
      // pg-copy-streams hoạt động tốt nhất với định dạng text/csv
      const copyQuery = `COPY ${tableName} (${columns.join(
        ", "
      )}) FROM STDIN WITH (FORMAT csv, HEADER false, DELIMITER ',')`;

      const stream = client.query(copyFrom(copyQuery));

      // 2. Đọc Excel bằng Stream
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
        entries: "emit",
        sharedStrings: "cache",
        styles: "cache",
        hyperlinks: "emit",
      });

      // Tạo một Readable stream để đẩy dữ liệu vào Postgres COPY stream
      const csvStream = new Readable({
        read() {},
      });

      // Pipeline handling
      const importPromise = new Promise((resolve, reject) => {
        stream.on("finish", () => {
          const duration = (Date.now() - startTime) / 1000;
          logger.info(
            `Bulk import to ${tableName} completed: ${rowCount} rows in ${duration}s`
          );
          resolve({ rowCount, duration });
        });
        stream.on("error", (err) => {
          logger.error(`Error in COPY stream for ${tableName}`, err);
          reject(err);
        });
        csvStream.on("error", reject);
      });

      csvStream.pipe(stream);

      // Đọc từng row từ Excel và đẩy vào csvStream
      for await (const worksheetReader of workbookReader) {
        if (worksheetReader.id === 1 || worksheetReader.name) {
          // Thường lấy sheet đầu tiên
          for await (const row of worksheetReader) {
            // Bỏ qua dòng tiêu đề (header) - dòng 1
            if (row.number === 1) continue;

            // Chuyển row thành format CSV (đơn giản hóa: join bằng dấu phẩy)
            // Lưu ý: Cần xử lý escape dấu phẩy nếu dữ liệu có chứa dấu phẩy
            const values = row.values
              .slice(1, columns.length + 1)
              .map((val) => {
                if (val === null || val === undefined) return "";

                let strVal = String(val);
                // Escape double quotes and wrap in double quotes if contains comma or newline
                if (
                  strVal.includes(",") ||
                  strVal.includes('"') ||
                  strVal.includes("\n")
                ) {
                  strVal = `"${strVal.replace(/"/g, '""')}"`;
                }
                return strVal;
              });

            csvStream.push(values.join(",") + "\n");
            rowCount++;
          }
        }
      }

      // Kết thúc stream
      csvStream.push(null);

      return await importPromise;
    } catch (error) {
      logger.error(`Bulk import failed for ${tableName}`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = BulkImportService;
