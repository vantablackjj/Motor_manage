const express = require("express");
const router = express.Router();
const Joi = require("joi");

const controller = require("../controllers/donHangMuaXe.controller");
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { ROLES } = require("../config/constants");
const { validate } = require("../middleware/validation");

const nhapXeMoiSchema = Joi.object({
  ngay_dat_hang: Joi.date().required(),
  ma_kho_nhap: Joi.string().required(),
  ma_ncc: Joi.string().required(),
  tong_tien: Joi.number(),

  nguoi_tao: Joi.string(),
  nguoi_gui: Joi.string(),
  nguoi_gui: Joi.string(),
  nguoi_duyet: Joi.string(),
  ngay_tao: Joi.date(),
  ngay_gui: Joi.date(),
  ngay_duyet: Joi.date(),
  dien_giai: Joi.string(),
  ghi_chu: Joi.string(),
});

const chiTietDonHang = Joi.object({
  ma_loai_xe: Joi.string().trim().required(),
  ma_mau: Joi.string().trim().optional().allow(null, ""),
  so_luong: Joi.number().integer().min(1).required(),
  don_gia: Joi.number().min(0).required(),
  thanh_tien: Joi.number().optional(),
  xe_key: Joi.string().max(50).optional(),
  so_khung: Joi.string().max(50).optional(),
  so_may: Joi.string().max(100).optional(),
  da_nhap_kho: Joi.boolean().optional(),
});

const createWithDetailsSchema = Joi.object({
  ma_kho_nhap: Joi.string().required(),
  ma_ncc: Joi.string().required(),
  chi_tiet: Joi.array().items(chiTietDonHang).min(1).required(),
});

router.use(authenticate);

/**
 * 1. Lấy danh sách đơn mua
 */
router.get(
  "/",
  checkRole(ROLES.NHAN_VIEN, ROLES.QUAN_LY, ROLES.ADMIN),
  controller.getList
);

/**
 * 2. Tạo đơn mua (header only - legacy)
 */
router.post(
  "/",
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN),
  validate(nhapXeMoiSchema),
  validate(nhapXeMoiSchema),
  controller.create
);

/**
 * 2.1 Tạo đơn mua KÈM CHI TIẾT (ATOMIC) - FIX RACE CONDITION
 * ⚠️ MUST be before /:ma_phieu routes to avoid route conflicts
 */
router.post(
  "/create-with-details",
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN),
  validate(createWithDetailsSchema),
  controller.createWithDetails
);

/**
 * 2.1 Xóa chi tiết đơn
 */
router.delete(
  "/:ma_phieu/chi-tiet/:id",
  checkRole(ROLES.NHAN_VIEN, ROLES.ADMIN),
  controller.deleteChiTiet
);

/**
 * 2. Thêm chi tiết đơn
 */
router.post(
  "/:ma_phieu/chi-tiet",
  checkRole(ROLES.NHAN_VIEN, ROLES.ADMIN),
  validate(chiTietDonHang),
  controller.addChiTiet
);

/**
 * 3. Gửi duyệt
 */
router.post(
  "/:ma_phieu/submit",
  checkRole(ROLES.NHAN_VIEN, ROLES.ADMIN),
  controller.submit
);

/**
 * 4. Duyệt đơn
 */
router.post(
  "/:ma_phieu/approve",
  checkRole(ROLES.QUAN_LY, ROLES.ADMIN),
  controller.approve
);

/**
 * 4.1 Từ chối đơn
 */
router.post(
  "/:ma_phieu/reject",
  checkRole(ROLES.QUAN_LY, ROLES.ADMIN),
  controller.reject
);

/**
 * 5. Lấy chi tiết đơn
 */
router.get(
  "/:ma_phieu",
  checkRole(ROLES.NHAN_VIEN, ROLES.QUAN_LY, ROLES.ADMIN),
  controller.detail
);

/**
 * 6. Nhập kho xe (Receiving)
 */
router.post(
  "/:ma_phieu/nhap-kho",
  checkRole(ROLES.NHAN_VIEN, ROLES.QUAN_LY, ROLES.ADMIN),
  controller.nhapKho
);

module.exports = router;
