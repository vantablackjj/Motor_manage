const Xe = require("../services/xe.service");
const VehicleService = require("../services/themXe.service");
const { sendSuccess, sendError } = require("../utils/response");

class XeController {
  // Lấy tất cả danh sách xe với filters
  async getAll(req, res, next) {
    try {
      const filters = req.query;
      const data = await Xe.getAll(filters);
      sendSuccess(res, data, "Lấy danh sách xe thành công");
    } catch (err) {
      next(err);
    }
  }

  // Lấy xe theo xe_key
  async getByXeKey(req, res, next) {
    try {
      const { xe_key } = req.params;
      const xe = await Xe.getByXeKey(xe_key);

      if (!xe) {
        return sendError(res, "Không tìm thấy xe", 404);
      }

      // Warehouse isolation check
      const { ROLES } = require("../config/constants");
      const hasFullAccess = [
        ROLES.ADMIN,
        ROLES.QUAN_LY,
        ROLES.QUAN_LY_CTY,
        ROLES.KE_TOAN,
      ].includes(req.user.vai_tro);

      if (!hasFullAccess && xe.ma_kho_hien_tai !== req.user.ma_kho) {
        return sendError(
          res,
          "Bạn không có quyền xem thông tin xe tại kho khác",
          403,
        );
      }

      sendSuccess(res, xe, "Lấy thông tin xe thành công");
    } catch (err) {
      next(err);
    }
  }

  // Lấy tồn kho tại một kho cụ thể
  async getTonKho(req, res, next) {
    try {
      const { ma_kho } = req.params;
      const filters = req.query;
      const data = await Xe.getTonKho(ma_kho, filters);
      sendSuccess(res, data, "Lấy danh sách tồn kho thành công");
    } catch (err) {
      next(err);
    }
  }

  // Lấy lịch sử giao dịch của xe
  async getHistory(req, res, next) {
    try {
      const { xe_key } = req.params;
      const xe = await Xe.getByXeKey(xe_key);

      if (!xe) {
        return sendError(res, "Không tìm thấy xe", 404);
      }

      // Warehouse isolation check
      const { ROLES } = require("../config/constants");
      const hasFullAccess = [
        ROLES.ADMIN,
        ROLES.QUAN_LY,
        ROLES.QUAN_LY_CTY,
        ROLES.KE_TOAN,
      ].includes(req.user.vai_tro);

      if (!hasFullAccess && xe.ma_kho_hien_tai !== req.user.ma_kho) {
        return sendError(
          res,
          "Bạn không có quyền xem lịch sử xe tại kho khác",
          403,
        );
      }

      const data = await Xe.getLichSu(xe_key);
      sendSuccess(res, data, "Lấy lịch sử xe thành công");
    } catch (err) {
      next(err);
    }
  }

  // Lấy danh sách xe chờ duyệt
  async getApprovalList(req, res, next) {
    try {
      const data = await Xe.getApprovalList(req.query);
      sendSuccess(res, data, "Lấy danh sách chờ duyệt thành công");
    } catch (err) {
      next(err);
    }
  }

  // Nhập xe mới (chờ duyệt)
  async createVehicle(req, res, next) {
    try {
      const result = await VehicleService.nhapXeMoi(req.body, req.user.id);
      sendSuccess(res, result.data, result.message, 201);
    } catch (err) {
      next(err);
    }
  }

  // Gửi yêu cầu duyệt xe
  async submitForApproval(req, res, next) {
    try {
      const { xe_key } = req.params;
      const result = await VehicleService.guiDuyetXe(xe_key, req.user.id);
      sendSuccess(res, result, "Đã gửi yêu cầu phê duyệt");
    } catch (err) {
      next(err);
    }
  }

  // Phê duyệt nhập xe
  async approveVehicle(req, res, next) {
    try {
      const { xe_key } = req.params;
      const result = await VehicleService.pheDuyetXe(xe_key, req.user.id);
      sendSuccess(res, result, "Đã phê duyệt nhập xe");
    } catch (err) {
      next(err);
    }
  }

  // Từ chối nhập xe
  async rejectVehicle(req, res, next) {
    try {
      const { xe_key } = req.params;
      const { ly_do } = req.body;
      const result = await VehicleService.tuChoiXe(xe_key, req.user.id, ly_do);
      sendSuccess(res, result, "Đã từ chối nhập xe");
    } catch (err) {
      next(err);
    }
  }

  // Cập nhật thông tin xe
  async updateVehicle(req, res, next) {
    try {
      const { xe_key } = req.params;
      const xe = await Xe.update(xe_key, req.body, req.user.id);
      sendSuccess(res, xe, "Cập nhật xe thành công");
    } catch (err) {
      next(err);
    }
  }

  // Khóa xe (để gán vào phiếu/hóa đơn)
  async lockVehicle(req, res, next) {
    try {
      const { xe_key } = req.params;
      const { ma_phieu, ly_do } = req.body;
      const xe = await Xe.lock(xe_key, ma_phieu, ly_do);
      sendSuccess(res, xe, "Đã khóa xe thành công");
    } catch (err) {
      next(err);
    }
  }

  // Mở khóa xe
  async unlockVehicle(req, res, next) {
    try {
      const { xe_key } = req.params;
      const xe = await Xe.unlock(xe_key);
      sendSuccess(res, xe, "Đã mở khóa xe thành công");
    } catch (err) {
      next(err);
    }
  }

  // Kiểm tra trùng số khung số máy
  async checkDuplicate(req, res, next) {
    try {
      const { so_khung, so_may, exclude_id } = req.body;
      const errors = await Xe.checkDuplicate(so_khung, so_may, exclude_id);
      sendSuccess(
        res,
        {
          is_duplicate: errors.length > 0,
          errors: errors,
        },
        "Kiểm tra dữ liệu thành công",
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new XeController();
