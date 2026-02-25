const Kho = require("../services/kho.service");
const { sendSuccess, sendError } = require("../utils/response");

class KhoController {
  // Lấy toàn bộ danh sách kho
  async getAll(req, res, next) {
    try {
      const filters = {
        chinh:
          req.query.chinh === "true"
            ? true
            : req.query.chinh === "false"
              ? false
              : undefined,
        daily:
          req.query.daily === "true"
            ? true
            : req.query.daily === "false"
              ? false
              : undefined,
      };

      const data = await Kho.getAll(filters);
      sendSuccess(res, data, "Lấy danh sách kho thành công");
    } catch (error) {
      next(error);
    }
  }

  // Lấy chi tiết một kho
  async getByMa(req, res, next) {
    try {
      const { ma_kho } = req.params;
      const data = await Kho.getByMaKho(ma_kho);

      if (!data) {
        return sendError(res, "Kho không tồn tại", 404);
      }

      sendSuccess(res, data, "Lấy thông tin kho thành công");
    } catch (error) {
      next(error);
    }
  }

  // Tạo mới kho
  async create(req, res, next) {
    try {
      const data = await Kho.create(req.body);
      sendSuccess(res, data, "Tạo kho thành công", 201);
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật thông tin kho
  async update(req, res, next) {
    try {
      const { ma_kho } = req.params;
      const data = await Kho.update(ma_kho, req.body);

      if (!data) {
        return sendError(res, "Kho không tồn tại", 404);
      }

      sendSuccess(res, data, "Cập nhật kho thành công");
    } catch (error) {
      next(error);
    }
  }

  // Xóa kho (soft delete)
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Kho.softDeleteById(id);

      if (!data) {
        return sendError(res, "Kho không tồn tại", 404);
      }

      sendSuccess(res, data, "Xóa kho thành công");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new KhoController();
