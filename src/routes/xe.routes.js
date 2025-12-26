const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { sendSuccess, sendError } = require("../ultils/respone");

const Joi = require("joi");
const { ROLES } = require("../config/constants");
const XeService = require("../services/xe.service");

/* =====================================================
 * VALIDATION
 * ===================================================== */
const themXeSchema = Joi.object({
  xe_key: Joi.string().required().max(50),
  ma_loai_xe: Joi.string().max(50),
  ma_mau: Joi.string().max(50).allow(null),
  so_khung: Joi.string().required().max(100),
  so_may: Joi.string().required().max(100),
  ma_kho_hien_tai: Joi.string().required().max(50),
  ngay_nhap: Joi.date().required(),
  gia_nhap: Joi.number().min(0).required(),
  ghi_chu: Joi.string().allow("", null),
});

/* =====================================================
 * GET /api/v1/xe/ton-kho/:ma_kho
 * ===================================================== */
router.get(
  "/ton-kho/:ma_kho",
  authenticate,
  async (req, res, next) => {
    try {
      const { ma_kho } = req.params;
      const { ma_loai_xe, ma_mau, locked } = req.query;

      const filters = {
        ma_loai_xe,
        ma_mau,
      };

      if (locked !== undefined) {
        filters.locked = locked === "true";
      }

      const data = await XeService.getTonKho(ma_kho, filters);
      sendSuccess(res, data, "Lấy tồn kho xe thành công");
    } catch (error) {
      next(error);
    }
  }
);

/* =====================================================
 * GET /api/v1/xe/:xe_key
 * ===================================================== */
router.get("/:xe_key", authenticate, async (req, res, next) => {
  try {
    const { xe_key } = req.params;

    const xe = await XeService.getByXeKey(xe_key);
    if (!xe) {
      return sendError(res, "Xe không tồn tại", 404);
    }

    sendSuccess(res, xe, "Lấy thông tin xe thành công");
  } catch (error) {
    next(error);
  }
});

/* =====================================================
 * GET /api/v1/xe/:xe_key/lich-su
 * ===================================================== */
router.get("/:xe_key/lich-su", authenticate, async (req, res, next) => {
  try {
    const { xe_key } = req.params;

    const lichSu = await XeService.getLichSu(xe_key);
    sendSuccess(res, lichSu, "Lấy lịch sử xe thành công");
  } catch (error) {
    next(error);
  }
});

/* =====================================================
 * POST /api/v1/xe
 * ===================================================== */
router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY),
  validate(themXeSchema),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        nguoi_tao: req.user.username,
      };

      const xe = await XeService.create(data);
      sendSuccess(res, xe, "Thêm xe thành công", 201);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
