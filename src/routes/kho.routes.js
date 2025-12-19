const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { sendSuccess, sendError } = require("../ultils/respone");
const Kho = require("../services/kho.service")
const Joi = require("joi");
const { ROLES } = require("../config/constants");



// Validation schemas
const createKhoSchema = Joi.object({
  ma_kho: Joi.string().required().max(50),
  ten_kho: Joi.string().required().max(200),
  dia_chi: Joi.string().max(500).allow("", null),
  dien_thoai: Joi.string().max(50).allow("", null),
  mac_dinh: Joi.boolean().default(false),
  chinh: Joi.boolean().default(false),
  daily: Joi.boolean().default(false),
  ghi_chu: Joi.string().allow("", null),
});

const updateKhoSchema = Joi.object({
  ten_kho: Joi.string().required().max(200),
  dia_chi: Joi.string().max(500).allow("", null),
  dien_thoai: Joi.string().max(50).allow("", null),
  mac_dinh: Joi.boolean(),
  chinh: Joi.boolean(),
  daily: Joi.boolean(),
  ghi_chu: Joi.string().allow("", null),
});

// GET /api/kho - Lấy danh sách kho
router.get("/", authenticate, async (req, res, next) => {
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
});

// GET /api/kho/:ma_kho - Lấy chi tiết kho
router.get("/:ma_kho", authenticate, async (req, res, next) => {
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
});

// POST /api/v1/kho - Tạo kho mới
router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY),
  validate(createKhoSchema),
  async (req, res, next) => {
    try {
      const data = await Kho.create(req.body);
      sendSuccess(res, data, "Tạo kho thành công", 201);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/kho/:ma_kho - Cập nhật kho
router.put(
  "/:ma_kho",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY),
  validate(updateKhoSchema),
  async (req, res, next) => {
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
);

// DELETE /api/v1/kho/:ma_kho - Xóa kho (soft delete)
router.delete(
  "/:ma_kho",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { ma_kho } = req.params;
      const data = await Kho.softDelete(ma_kho);

      if (!data) {
        return sendError(res, "Kho không tồn tại", 404);
      }

      sendSuccess(res, data, "Xóa kho thành công");
    } catch (error) {
      next(error);
    }
  }
);


module.exports = router;

