const express = require("express");
const router = express.Router();

const Joi = require("joi");
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { ROLES } = require("../config/constants");
const BrandService = require("../services/brands.service");
const { sendSuccess, sendError } = require("../utils/response");

// Schema cho nhóm phụ tùng (nhóm hàng) - default ma_nhom_cha = 'PT'
const nhomHangSchema = Joi.object({
  ma_nh: Joi.string().max(50),
  ten_nh: Joi.string().required().max(200),
  ma_nhom_cha: Joi.string().max(50).default("PT"),
  status: Joi.boolean().default(true),
});

// Lấy danh sách nhóm hàng (mặc định nhóm phụ tùng - PT)
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filters = {
      ...req.query,
      ma_nhom_cha: req.query.ma_nhom_cha || "PT",
    };
    const data = await BrandService.getAll(filters);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// Lấy 1 nhóm hàng theo mã
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const ma_nhom_cha = req.query.ma_nhom_cha || "PT";
    const data = await BrandService.getById(req.params.id, ma_nhom_cha);
    if (!data) {
      return sendError(res, "Nhóm hàng không tồn tại", 404);
    }
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
});

// Tạo mới nhóm hàng (phụ tùng)
router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(nhomHangSchema),
  async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        ma_nhom_cha: req.body.ma_nhom_cha || "PT",
      };
      const data = await BrandService.create(body);
      sendSuccess(res, data, "Tạo nhóm phụ tùng thành công", 201);
    } catch (err) {
      if (err.message.includes("tồn tại")) {
        return sendError(res, err.message, 409);
      }
      next(err);
    }
  },
);

// Cập nhật nhóm hàng (phụ tùng)
router.put(
  "/:id",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(nhomHangSchema),
  async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        ma_nhom_cha: req.body.ma_nhom_cha || "PT",
      };
      const data = await BrandService.update(req.params.id, body);
      sendSuccess(res, data, "Cập nhật nhóm phụ tùng thành công");
    } catch (err) {
      if (err.message.includes("không tồn tại")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  },
);

// Xóa mềm nhóm hàng (phụ tùng)
router.delete(
  "/:id",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const ma_nhom_cha = req.query.ma_nhom_cha || "PT";
      const data = await BrandService.delete(req.params.id, ma_nhom_cha);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

