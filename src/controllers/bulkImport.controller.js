const BulkImportService = require("../services/bulkImport.service");
const logger = require("../ultils/logger");
const path = require("path");
const fs = require("fs");

class BulkImportController {
  /**
   * Import khách hàng từ Excel
   */
  static async importKhachHang(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng đính kèm file Excel",
        });
      }

      const filePath = req.file.path;
      // Danh sách cột trong bảng tm_khach_hang tương ứng với các cột trong Excel
      // Giả sử Excel có các cột: Mã KH, Họ tên, Điện thoại, Địa chỉ, Email, Là NCC (true/false)
      const columns = [
        "ma_kh",
        "ho_ten",
        "dien_thoai",
        "dia_chi",
        "email",
        "la_ncc",
      ];

      const result = await BulkImportService.importExcelToTable(
        filePath,
        "tm_khach_hang",
        columns
      );

      // Xóa file sau khi xử lý xong
      fs.unlinkSync(filePath);

      res.status(200).json({
        success: true,
        message: "Import dữ liệu thành công",
        data: result,
      });
    } catch (error) {
      // Xóa file nếu có lỗi
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      logger.error("Error in importKhachHang controller", error);
      next(error);
    }
  }

  /**
   * Import phụ tùng từ Excel
   */
  static async importPhuTung(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng đính kèm file Excel",
        });
      }

      const filePath = req.file.path;
      // Cột mẫu cho phụ tùng
      const columns = [
        "ma_pt",
        "ten_pt",
        "don_vi_tinh",
        "gia_nhap",
        "gia_ban_le",
        "nhom_pt",
      ];

      const result = await BulkImportService.importExcelToTable(
        filePath,
        "tm_phu_tung",
        columns
      );

      fs.unlinkSync(filePath);

      res.status(200).json({
        success: true,
        message: "Import dữ liệu thành công",
        data: result,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
}

module.exports = BulkImportController;
