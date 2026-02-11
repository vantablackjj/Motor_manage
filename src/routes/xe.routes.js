const express = require("express");
const router = express.Router();

const Xe = require("../services/xe.service");
const VehicleService = require("../services/themXe.service"); // Add this
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { checkRole } = require("../middleware/roleCheck");
const { ROLES } = require("../config/constants");
const Joi = require("joi");

const themXeSchema = Joi.object({
  ma_loai_xe: Joi.string().max(50).required(),
  ma_mau: Joi.string().max(50).allow(null, ""),
  so_khung: Joi.string().max(100).required(),
  so_may: Joi.string().max(100).required(),
  ma_kho_hien_tai: Joi.string().max(50).required(),
  ngay_nhap: Joi.date().optional(),
  gia_nhap: Joi.number().min(0).optional(),
  ghi_chu: Joi.string().allow("", null).optional(),
});

const capNhatXeSchema = Joi.object({
  ma_loai_xe: Joi.string().max(50),
  ma_mau: Joi.string().max(50).allow(null),
  so_khung: Joi.string().max(100),
  so_may: Joi.string().max(100),
  bien_so: Joi.string().max(50).allow(null),
  gia_nhap: Joi.number().min(0),
  ghi_chu: Joi.string().allow("", null),
}).min(1);

/**
 * =========================
 * GET
 * =========================
 */

// Lấy xe theo xe_key
router.get("/:xe_key", authenticate, async (req, res, next) => {
  try {
    const { xe_key } = req.params;
    const xe = await Xe.getByXeKey(xe_key);

    if (!xe) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy xe",
      });
    }

    res.json({ success: true, data: xe });
  } catch (err) {
    next(err);
  }
});

// Lấy tồn kho theo kho
router.get("/kho/:ma_kho", authenticate, async (req, res, next) => {
  try {
    const { ma_kho } = req.params;
    const filters = req.query;

    const data = await Xe.getTonKho(ma_kho, filters);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Alias cho tồn kho (theo yêu cầu user)
router.get("/ton-kho/:ma_kho", authenticate, async (req, res, next) => {
  try {
    const { ma_kho } = req.params;
    const filters = req.query;
    const data = await Xe.getTonKho(ma_kho, filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Lấy lịch sử xe
router.get("/:xe_key/lich-su", authenticate, async (req, res, next) => {
  try {
    const { xe_key } = req.params;
    const data = await Xe.getLichSu(xe_key);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Lấy danh sách xe chờ duyệt
router.get("/approval/list", authenticate, async (req, res, next) => {
  try {
    const data = await Xe.getApprovalList(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * =========================
 * POST
 * =========================
 */

// Tạo xe mới
router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  validate(themXeSchema),
  async (req, res, next) => {
    try {
      const result = await VehicleService.nhapXeMoi(req.body, req.user.id);

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Gửi duyệt xe
router.post("/:xe_key/submit", authenticate, async (req, res, next) => {
  try {
    const { xe_key } = req.params;
    const result = await VehicleService.guiDuyetXe(xe_key, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Duyệt xe
router.post(
  "/:xe_key/approve",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  async (req, res, next) => {
    try {
      const { xe_key } = req.params;
      const result = await VehicleService.pheDuyetXe(xe_key, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Từ chối xe
router.post(
  "/:xe_key/reject",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  async (req, res, next) => {
    try {
      const { xe_key } = req.params;
      const { ly_do } = req.body;
      const result = await VehicleService.tuChoiXe(xe_key, req.user.id, ly_do);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * =========================
 * PUT
 * =========================
 */

// Cập nhật xe
router.put(
  "/:xe_key",
  authenticate,
  validate(capNhatXeSchema),
  async (req, res, next) => {
    try {
      const { xe_key } = req.params;
      const data = req.body;

      const xe = await Xe.update(xe_key, data, req.user.id);

      res.json({
        success: true,
        data: xe,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Khóa xe
router.put("/:xe_key/lock", authenticate, async (req, res, next) => {
  try {
    const { xe_key } = req.params;
    const { ma_phieu, ly_do } = req.body;

    const xe = await Xe.lock(xe_key, ma_phieu, ly_do);

    res.json({ success: true, data: xe });
  } catch (err) {
    next(err);
  }
});

// Mở khóa xe
router.put("/:xe_key/unlock", authenticate, async (req, res, next) => {
  try {
    const { xe_key } = req.params;

    const xe = await Xe.unlock(xe_key);

    res.json({ success: true, data: xe });
  } catch (err) {
    next(err);
  }
});

/**
 * =========================
 * UTIL
 * =========================
 */

// Mở khóa theo phiếu
router.put("/unlock/phieu/:ma_phieu", authenticate, async (req, res, next) => {
  try {
    const { ma_phieu } = req.params;
    const data = await Xe.unlockByPhieu(ma_phieu);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Kiểm tra trùng
router.post("/check-duplicate", async (req, res, next) => {
  try {
    const { so_khung, so_may, exclude_id } = req.body;
    if (!so_khung || !so_may) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin số khung hoặc số máy",
      });
    }
    const errors = await Xe.checkDuplicate(so_khung, so_may, exclude_id);
    res.json({
      success: true,
      is_duplicate: errors.length > 0,
      errors: errors,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
