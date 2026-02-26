const MaintenanceService = require("../services/MaintenanceService");
const BaoTri = require("../models/BaoTri");
const logger = require("../utils/logger");

class MaintenanceController {
  // Tạo phiếu bảo trì
  static async create(req, res) {
    try {
      const data = {
        ...req.body,
        nguoi_lap_phieu: req.user.username,
      };
      const result = await MaintenanceService.createMaintenanceRecord(data);
      res.status(201).json({
        success: true,
        message: "Tạo phiếu bảo trì thành công",
        data: result,
      });
    } catch (error) {
      logger.error("Error creating maintenance record:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Lấy danh sách phiếu
  static async getAll(req, res) {
    try {
      const results = await BaoTri.getAll(req.query);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Lấy chi tiết phiếu
  static async getById(req, res) {
    try {
      const result = await BaoTri.getById(req.params.id);
      if (!result) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy phiếu" });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Kích hoạt trình nhắc nhở thủ công (hoặc qua cron)
  static async triggerReminders(req, res) {
    try {
      const result = await MaintenanceService.runDailyReminders();
      res.json({
        success: true,
        message: "Đã chạy trình nhắc nhở",
        data: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Phê duyệt phiếu bảo trì
  static async approve(req, res) {
    try {
      const { id } = req.params;
      const { ma_kho } = req.body; // Có thể chọn kho xuất phụ tùng khi duyệt
      const result = await MaintenanceService.approveMaintenanceRecord(
        id,
        req.user.username,
        ma_kho,
      );
      res.json({
        success: true,
        message: "Phê duyệt phiếu bảo trì thành công",
        data: result,
      });
    } catch (error) {
      logger.error("Error approving maintenance record:", error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || "Lỗi phê duyệt phiếu",
      });
    }
  }

  // Từ chối/Hủy phiếu bảo trì
  static async reject(req, res) {
    try {
      const { id } = req.params;
      const result = await MaintenanceService.rejectMaintenanceRecord(
        id,
        req.user.username,
      );
      res.json({
        success: true,
        message: "Đã từ chối/hủy phiếu bảo trì",
        data: result,
      });
    } catch (error) {
      logger.error("Error rejecting maintenance record:", error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || "Lỗi hủy phiếu",
      });
    }
  }
}

module.exports = MaintenanceController;
