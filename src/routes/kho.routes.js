const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validate } = require("../middleware/validation");
const { sendSuccess, sendError } = require("../ultils/respone");
const Kho = require("../services/kho.service");
const Joi = require("joi");

// Validation schemas
const createKhoSchema = Joi.object({
  ma_kho: Joi.string().max(50),
  ten_kho: Joi.string().required().max(200),
  dia_chi: Joi.string().max(500).allow("", null),
  dien_thoai: Joi.string().max(50).allow("", null),
  loai_kho: Joi.string().valid("CHINH", "DAILY").required(),
  mac_dinh: Joi.boolean().default(false),
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
router.get("/:id", authenticate, async (req, res, next) => {
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

// POST tạo kho mới - chỉ QUAN_LY, ADMIN
router.post(
  "/",
  authenticate,
  checkPermission("warehouses", "create"),
  validate(createKhoSchema),
  async (req, res, next) => {
    try {
      const data = await Kho.create(req.body);
      sendSuccess(res, data, "Tạo kho thành công", 201);
    } catch (error) {
      next(error);
    }
  },
);

// PUT cập nhật kho - QUAN_LY, ADMIN
router.put(
  "/:ma_kho",
  authenticate,
  checkPermission("warehouses", "edit"),
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
  },
);

// DELETE xóa kho (soft delete) - chỉ ADMIN
router.delete(
  "/:id",
  authenticate,
  checkPermission("warehouses", "delete"),
  async (req, res, next) => {
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
  },
);

module.exports = router;
