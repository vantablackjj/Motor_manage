// controllers/noiSx.controller.js
const NoiSxService = require("../services/noiSx.service");
const { sendSuccess, sendError } = require("../ultils/respone");

exports.getAll = async (req, res, next) => {
  try {
    const data = await NoiSxService.getAll(req.query);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await NoiSxService.getById(req.params.id);
    if (!data) {
      return sendError(res, "Nơi sản xuất không tồn tại", 404);
    }
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await NoiSxService.create(req.body);
    sendSuccess(res, data, "Tạo nơi sản xuất thành công", 201);
  } catch (err) {
    if (err.message.includes("tồn tại")) {
      return sendError(res, err.message, 409);
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await NoiSxService.update(req.params.id, req.body);
    sendSuccess(res, data, "Cập nhật nơi sản xuất thành công");
  } catch (err) {
    if (err.message.includes("không tồn tại")) {
      return sendError(res, err.message, 404);
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await NoiSxService.delete(req.params.id);
    if (!data) {
      return sendError(res, "Nơi sản xuất không tồn tại", 404);
    }
    sendSuccess(res, null, "Xóa nơi sản xuất thành công");
  } catch (err) {
    next(err);
  }
};
