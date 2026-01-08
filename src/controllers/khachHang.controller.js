// controllers/khachHang.controller.js
const khachHangService = require("../services/khachHang.service");
const { sendSuccess, sendError } = require("../ultils/respone");

exports.getAll = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status !== undefined) {
      filters.status = req.query.status === "true";
    }
    if (req.query.la_ncc !== undefined) {
      filters.la_ncc = req.query.la_ncc === "true";
    }
    const data = await khachHangService.getAll(filters);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await khachHangService.getById(req.params.ma_kh);
    if (!data) {
      return sendError(res, "Khách hàng không tồn tại", 404);
    }
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await khachHangService.create(req.body);
    sendSuccess(res, data, "Tạo khách hàng thành công", 201);
  } catch (err) {
    if (err.message.includes("tồn tại")) {
      return sendError(res, err.message, 409);
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await khachHangService.update(req.params.ma_kh, req.body);
    sendSuccess(res, data, "Cập nhật  thành công");
  } catch (err) {
    if (err.message.includes("không tồn tại")) {
      return sendError(res, err.message, 404);
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await khachHangService.delete(req.params.ma_kh);
    if (!data) {
      return sendError(res, "Khách không tồn tại", 404);
    }
    sendSuccess(res, null, "Xóa  thành công");
  } catch (err) {
    next(err);
  }
};
