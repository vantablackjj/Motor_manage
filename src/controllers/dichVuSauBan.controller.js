const DichVuSauBanService = require("../services/dichVuSauBan.service");
const { sendSuccess, sendError } = require("../utils/response");

class DichVuSauBanController {
  /** GET /api/dich-vu-sau-ban */
  static async getList(req, res) {
    try {
      const result = await DichVuSauBanService.getList(req.query);
      return sendSuccess(
        res,
        result,
        "Lấy danh sách dịch vụ sau bán thành công",
      );
    } catch (err) {
      return sendError(res, err.message, err.status || 500);
    }
  }

  /** GET /api/dich-vu-sau-ban/stats */
  static async getStats(req, res) {
    try {
      const result = await DichVuSauBanService.getStats();
      return sendSuccess(
        res,
        result,
        "Lấy thống kê dịch vụ sau bán thành công",
      );
    } catch (err) {
      return sendError(res, err.message, err.status || 500);
    }
  }

  /** GET /api/dich-vu-sau-ban/:xe_key */
  static async getByXeKey(req, res) {
    try {
      const result = await DichVuSauBanService.getByXeKey(req.params.xe_key);
      if (!result) {
        return sendError(res, "Không tìm thấy xe hoặc xe chưa được bán", 404);
      }
      return sendSuccess(res, result);
    } catch (err) {
      return sendError(res, err.message, err.status || 500);
    }
  }

  /**
   * PATCH /api/dich-vu-sau-ban/:xe_key/dang-ky
   * Body: { bien_so, ngay_tra_dang_ky?, ghi_chu? }
   */
  static async capNhatDangKy(req, res) {
    try {
      const result = await DichVuSauBanService.capNhatDangKy(
        req.params.xe_key,
        req.body,
        req.user.username,
      );
      return sendSuccess(res, result, "Cập nhật đăng ký xe thành công");
    } catch (err) {
      return sendError(res, err.message, err.status || 500);
    }
  }

  /**
   * PATCH /api/dich-vu-sau-ban/:xe_key/dang-kiem
   * Body: { ngay_tra_dang_kiem?, ghi_chu? }
   */
  static async capNhatDangKiem(req, res) {
    try {
      const result = await DichVuSauBanService.capNhatDangKiem(
        req.params.xe_key,
        req.body,
        req.user.username,
      );
      return sendSuccess(res, result, "Cập nhật đăng kiểm xe thành công");
    } catch (err) {
      return sendError(res, err.message, err.status || 500);
    }
  }
}

module.exports = DichVuSauBanController;
