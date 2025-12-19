
const ModelService = require('../services/modelCar.service');
const { sendSuccess, sendError } = require('../ultils/respone');

exports.getAll = async (req, res, next) => {
  try {
    const filters = {
      ma_nh: req.query.ma_nh,
      status:
        req.query.status === 'true'
          ? true
          : req.query.status === 'false'
          ? false
          : undefined,
    };

    const data = await ModelService.getAll(filters);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const data = await ModelService.getById(req.params.ma_loai);
    if (!data) {
      return sendError(res, 'Loại xe không tồn tại', 404);
    }
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await ModelService.create(req.body);
    sendSuccess(res, data, 'Tạo loại xe thành công', 201);
  } catch (err) {
    if (
      err.message.includes('tồn tại') ||
      err.message.includes('Hãng xe')
    ) {
      return sendError(res, err.message, 400);
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await ModelService.update(
      req.params.ma_loai,
      req.body
    );
    sendSuccess(res, data, 'Cập nhật loại xe thành công');
  } catch (err) {
    if (err.message.includes('không tồn tại')) {
      return sendError(res, err.message, 404);
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const data = await ModelService.delete(req.params.ma_loai);
    if (!data) {
      return sendError(res, 'Loại xe không tồn tại', 404);
    }
    sendSuccess(res, null, 'Xóa loại xe thành công');
  } catch (err) {
    next(err);
  }
};
