const BrandService = require("../services/brands.service");
const { sendSuccess, sendError } = require("../utils/response");

exports.getAll = async (req, res, next) => {
  try {
    const data = await BrandService.getAll(req.query);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await BrandService.getById(
      req.params.id,
      req.query.type || req.query.ma_nhom_cha,
    );
    if (!data) {
      return sendError(res, "Hãng không tồn tại", 404);
    }
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await BrandService.create(req.body);
    sendSuccess(res, data, "Tao Hang xe thanh cong", 201);
  } catch (err) {
    if (err.message.includes("tồn tại")) {
      return sendError(res, err.message, 409);
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const parent = req.query.type || req.query.ma_nhom_cha;
    const data = await BrandService.update(req.params.id, req.body, parent);
    sendSuccess(res, data, "Cập nhật hãng xe thành công");
  } catch (err) {
    if (err.message.includes("không tồn tại")) {
      return sendError(res, err.message, 404);
    }
    next(err);
  }
};
exports.delete = async (req, res, next) => {
  try {
    const data = await BrandService.delete(
      req.params.id,
      req.query.type || req.query.ma_nhom_cha,
    );
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};
