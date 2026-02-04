// controllers/color.controller.js
const loaiHinhService = require("../services/loaiHinh.service");
const { sendSuccess, sendError } = require("../ultils/respone");

exports.getAll = async (req, res, next) => {
  try {
    const data = await loaiHinhService.getAll(req.query);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await loaiHinhService.getByID(req.params.id);
    if (!data) {
      return sendError(res, "Loại hình không tồn tại", 404);
    }
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await loaiHinhService.create(req.body);
    sendSuccess(res, data, "Tạo loại hình thành công", 201);
  } catch (err) {
    if (err.message.includes("tồn tại")) {
      return sendError(res, err.message, 409);
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await loaiHinhService.update(req.params.id, req.body);
    sendSuccess(res, data, "Cập nhật loại hình thành công");
  } catch (err) {
    if (err.message.includes("không tồn tại")) {
      return sendError(res, err.message, 404);
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await loaiHinhService.delete(req.params.id);
    if (!data) {
      return sendError(res, "Loại hình không tồn tại", 404);
    }
    sendSuccess(res, null, "Xóa loại hình thành công");
  } catch (err) {
    next(err);
  }
};
