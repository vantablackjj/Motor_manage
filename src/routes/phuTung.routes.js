const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkRole, checkWarehouseAccess } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { sendSuccess, sendError } = require("../ultils/respone");
const PhuTung = require("../services/phuTung.service");
const Joi = require("joi");
const { ROLES } = require("../config/constants");

/**
 * @swagger
 * tags:
 *   name: Phụ tùng
 *   description: Quản lý phụ tùng
 */

/**
 * @swagger
 * /api/phu-tung:
 *   get:
 *     summary: Lấy danh sách phụ tùng
 *     tags: [Phụ tùng]
 *     responses:
 *       200:
 *         description: Danh sách phụ tùng
 */

/**
 * @swagger
 * /api/phu-tung:
 *   post:
 *     summary: Tạo phụ tùng
 *     tags: [Phụ tùng]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ma_phu_tung:
 *                 type: string
 *                 example: PT001
 *               ten_phu_tung:
 *                 type: string
 *                 example: Lọc gió AirBlade
 *               gia_nhap:
 *                 type: number
 *                 example: 120000
 *     responses:
 *       201:
 *         description: Tạo thành công
 */

// Validation schemas
const createPhuTungSchema = Joi.object({
  ma_pt: Joi.string().required().max(50),
  ten_pt: Joi.string().required().max(200),
  don_vi_tinh: Joi.string().max(50).default("Cái"),
  nhom_pt: Joi.string().max(50).allow("", null),
  gia_nhap: Joi.number().min(0).required(),
  gia_ban: Joi.number().min(0).required(),
  vat: Joi.number().min(0).max(100).default(10),
  ghi_chu: Joi.string().allow("", null),
});

// GET /api/v1/phu-tung - Danh sách phụ tùng
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filters = {
      nhom_pt: req.query.nhom_pt,
      search: req.query.search,
    };

    const data = await PhuTung.getAll(filters);
    sendSuccess(res, data, "Lấy danh sách phụ tùng thành công");
  } catch (error) {
    next(error);
  }
});
router.get("/:ma_pt/lich-su", authenticate, async (req, res, next) => {
  try {
    const { ma_pt } = req.params;
    const data = await PhuTung.getLichSu(ma_pt);
    sendSuccess(res, data, "Lấy lịch sử phụ tùng thành công");
  } catch (error) {
    next(error);
  }});
// GET /api/phu-tung/ton-kho/:ma_kho - Tồn kho phụ tùng theo kho
router.get(
  "/ton-kho/:ma_kho",
  authenticate,
  checkWarehouseAccess("ma_kho"),
  async (req, res, next) => {
    try {
      const { ma_kho } = req.params;
      const filters = {
        trang_thai_ton: req.query.trang_thai_ton,
      };

      const data = await PhuTung.getTonKho(ma_kho, filters);
      sendSuccess(res, data, "Lấy tồn kho phụ tùng thành công");
    } catch (error) {
      next(error);
    }
  }
);

//PUT /api/phu-tung
router.put(
  "/:ma_pt",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY),
  validate(createPhuTungSchema),
  async (req, res, next) => {
    try {
      const {ma_pt} = req.params;
      const data = await PhuTung.update(ma_pt, req.body);

      if (!data) {
        return sendError(res, "Kho không tồn tại", 404);
      }
      sendSuccess(res, data, "Cập nhật phụ tùng thành công");
    }catch (error) {
      next(error);
    }
  }
);

router.post(
  "/phu-tung/nhap-kho",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  async (req, res, next) => {
    try {
      await PhuTungNhapKhoService.nhapKho({
        ...req.body,
        nguoi_thuc_hien: req.user.username,
      });

      sendSuccess(res, null, "Nhập kho phụ tùng thành công");
    } catch (error) {
      next(error);
    }
  }
);


// POST /api/phu-tung - Tạo phụ tùng mới
router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY),
  validate(createPhuTungSchema),
  async (req, res, next) => {
    try {
      const data = await PhuTung.create(req.body);
      sendSuccess(res, data, "Tạo phụ tùng thành công", 201);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:ma_pt",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY),
  async (req, res, next) => {
    try {
      const { ma_pt } = req.params;
      const data = await PhuTung.softDelete(ma_pt);

      if (!data) {
        return sendError(res, "Phụ tùng không tồn tại", 404);
      }

      sendSuccess(res, data, "Khóa phụ tùng thành công");
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/lock",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  async (req, res, next) => {
    try {
      await PhuTung.lock({
        ...req.body,
        nguoi_thuc_hien: req.user.username
      });

      sendSuccess(res, null, "Khóa tồn kho phụ tùng thành công");
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/unlock/:so_phieu",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  async (req, res, next) => {
    try {
      await PhuTung.unlock(req.params.so_phieu);
      sendSuccess(res, null, "Mở khóa tồn kho thành công");
    } catch (error) {
      next(error);
    }
  }
);



module.exports = router;
