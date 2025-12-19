const express = require('express');
const router = express.Router();
const Joi= require("joi")

const controller = require('../controllers/donHangMuaXe.controller');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const {ROLES} = require('../config/constants');
const {validate} = require("../middleware/validation")

const nhapXeMoiSchema = Joi.object({
  
  ngay_dat_hang:Joi.date().required(),
  ma_kho_nhap:Joi.string().required(),
  ma_ncc:Joi.string().required(),
  tong_tien:Joi.number(),
  
  nguoi_tao:Joi.string(),
  nguoi_gui:Joi.string(),
  nguoi_gui:Joi.string(),
  nguoi_duyet:Joi.string(),
  ngay_tao:Joi.date(),
  ngay_gui:Joi.date(),
  ngay_duyet:Joi.date(),
  dien_giai:Joi.string(),
  ghi_chu:Joi.string()
});
const chiTietDonHang = Joi.object({
  ma_phieu: Joi.string().required(),
  stt :Joi.number().integer().required(),
  ma_loai_xe: Joi.string().trim().required(),
  ma_mau: Joi.string().trim().required(),
  so_luong: Joi.number().integer().required(),
  don_gia: Joi.number().positive().optional(),
  thanh_tien: Joi.number().required(),
  xe_key:Joi.string().max(50),
  so_khung:Joi.string().max(50),
  so_may:Joi.string().max(100),
  da_nhap_kho:Joi.boolean()
});
router.use(authenticate);

/**
 * 1. Tạo đơn mua
 */
router.post(
  '/',
  checkRole(ROLES.ADMIN,ROLES.NHAN_VIEN),
  validate(nhapXeMoiSchema),
  controller.create
);

/**
 * 2. Thêm chi tiết đơn
 */
router.post(
  '/:ma_phieu/chi-tiet',
  checkRole(ROLES.NHAN_VIEN, ROLES.ADMIN),
  validate(chiTietDonHang),
  controller.addChiTiet
);

/**
 * 3. Gửi duyệt
 */
router.post(
  '/:ma_phieu/submit',
  checkRole(ROLES.NHAN_VIEN, ROLES.ADMIN),
  controller.submit
);

/**
 * 4. Duyệt đơn
 */
router.post(
  '/:ma_phieu/approve',
  checkRole(ROLES.QUAN_LY, ROLES.ADMIN),
  controller.approve
);

/**
 * 5. Lấy chi tiết đơn
 */
router.get(
  '/:ma_phieu',
  checkRole(ROLES.NHAN_VIEN, ROLES.QUAN_LY, ROLES.ADMIN),
  controller.detail
);

module.exports = router;
