// controllers/color.controller.js
const ColorService = require("../services/color.service");
const { sendSuccess, sendError } = require("../ultils/respone");

exports.getAll = async (req, res, next) => {
  try {
    const data = await ColorService.getAll(req.query);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await ColorService.getById(req.params.ma_mau);
    if (!data) {
      return sendError(res, "Màu không tồn tại", 404);
    }
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await ColorService.create(req.body);
    sendSuccess(res, data, "Tạo màu thành công", 201);
  } catch (err) {
    if (err.message.includes("tồn tại")) {
      return sendError(res, err.message, 409);
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await ColorService.update(req.params.ma_mau, req.body);
    sendSuccess(res, data, "Cập nhật màu thành công");
  } catch (err) {
    if (err.message.includes("không tồn tại")) {
      return sendError(res, err.message, 404);
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await ColorService.delete(req.params.ma_mau);
    if (!data) {
      return sendError(res, "Màu không tồn tại", 404);
    }
    sendSuccess(res, data, "Khóa màu thành công");
  } catch (err) {
    next(err);
  }
};
