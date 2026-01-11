const ExcelJS = require("exceljs");
const logger = require("../ultils/logger");

class BulkExportService {
  /**
   * Export dữ liệu ra file Excel theo dạng stream
   * @param {Object} res - Express response object
   * @param {Array} data - Mảng dữ liệu cần export
   * @param {Array} columns - Định nghĩa các cột [{ header: 'Tên', key: 'ten', width: 20 }]
   * @param {string} fileName - Tên file khi tải về
   */
  static async exportToExcel(res, data, columns, fileName = "export.xlsx") {
    try {
      // Thiết lập header cho response để trình duyệt hiểu là tải file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${encodeURIComponent(fileName)}`
      );

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: true,
        useSharedStrings: true,
      });

      const worksheet = workbook.addWorksheet("Sheet1");

      // Định nghĩa các cột
      worksheet.columns = columns;

      // Add data rows
      for (const row of data) {
        worksheet.addRow(row).commit();
      }

      await workbook.commit();
      logger.info(`Excel export completed: ${fileName}`);
    } catch (error) {
      logger.error(`Excel export failed: ${fileName}`, error);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Lỗi khi xuất file Excel" });
      } else {
        res.end();
      }
    }
  }
}

module.exports = BulkExportService;
