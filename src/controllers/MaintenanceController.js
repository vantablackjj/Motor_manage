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
      res.status(error.status || 500).json({
        success: false,
        message: error.message || "Lỗi tạo phiếu bảo trì",
      });
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

      // Warehouse isolation check
      const { ROLES } = require("../config/constants");
      const hasFullAccess = [
        ROLES.ADMIN,
        ROLES.QUAN_LY,
        ROLES.QUAN_LY_CTY,
        ROLES.KE_TOAN,
      ].includes(req.user.vai_tro);

      const authorized = req.user.authorized_warehouses || [req.user.ma_kho];

      if (!hasFullAccess && !authorized.includes(result.ma_kho)) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn không có quyền xem phiếu bảo trì của kho này (Chưa được gán vào danh mục kho cho phép)",
        });
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

  // Lấy danh sách bàn nâng
  static async getBanNang(req, res) {
    try {
      const results = await MaintenanceService.getBanNang(req.query);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Cập nhật trạng thái phiếu (và bàn nâng)
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { trang_thai, ma_ban_nang, ma_kho, hinh_thuc_thanh_toan } =
        req.body;
      const result = await MaintenanceService.updateStatus(id, {
        trang_thai,
        ma_ban_nang,
        ma_kho,
        hinh_thuc_thanh_toan,
        user: req.user.username,
        userId: req.user.id,
      });
      res.json({
        success: true,
        message: "Cập nhật trạng thái thành công",
        data: result,
      });
    } catch (error) {
      logger.error("Error updating maintenance status:", error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || "Lỗi cập nhật phiếu",
      });
    }
  }

  // Lấy danh sách nhắc nhở bảo trì
  static async getReminders(req, res) {
    try {
      const results = await MaintenanceService.getReminders(req.query);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Cập nhật trạng thái nhắc nhở bảo trì
  static async updateReminderStatus(req, res) {
    try {
      const { id } = req.params;
      const result = await MaintenanceService.updateReminderStatus(
        id,
        req.body,
      );
      res.json({ success: true, message: "Cập nhật thành công", data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Lấy danh sách kỹ thuật viên
  static async getTechnicians(req, res) {
    try {
      const results = await MaintenanceService.getTechnicians(req.query);
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // CRUD Bàn nâng
  static async addBanNang(req, res) {
    try {
      const result = await MaintenanceService.addBanNang(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateBanNang(req, res) {
    try {
      const result = await MaintenanceService.updateBanNang(
        req.params.id,
        req.body,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteBanNang(req, res) {
    try {
      await MaintenanceService.deleteBanNang(req.params.id);
      res.json({ success: true, message: "Xóa bàn nâng thành công" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = MaintenanceController;
