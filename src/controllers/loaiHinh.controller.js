// controllers/color.controller.js
const loaiHinhService = require('../services/loaiHinh.service');
const { sendSuccess, sendError } = require('../ultils/respone');

exports.getAll = async (req, res, next) => {
  try {
    const data = await loaiHinhService.getAll();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await loaiHinhService.getById(req.params.ma_lh);
    if (!data) {
      return sendError(res, 'Màu không tồn tại', 404);
    }
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await loaiHinhService.create(req.body);
    sendSuccess(res, data, 'Tạo màu thành công', 201);
  } catch (err) {
    if (err.message.includes('tồn tại')) {
      return sendError(res, err.message, 409);
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await loaiHinhService.update(
      req.params.ma_lh,
      req.body
    );
    sendSuccess(res, data, 'Cập nhật màu thành công');
  } catch (err) {
    if (err.message.includes('không tồn tại')) {
      return sendError(res, err.message, 404);
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await loaiHinhService.delete(req.params.ma_lh);
    if (!data) {
      return sendError(res, 'Màu không tồn tại', 404);
    }
    sendSuccess(res, null, 'Xóa màu thành công');
  } catch (err) {
    next(err);
  }
};
