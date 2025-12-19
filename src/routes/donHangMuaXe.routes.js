const Joi = require('joi');
const {validate} = require('../middleware/validation')
const express = require('express')
const { authenticate } = require('../middleware/auth');
const {ROLES} = require('../config/constants')
const router = express.Router()
const vehicleController = require('../controllers/themXe.controller')
const { checkRole } = require('../middleware/roleCheck');

router.use(authenticate);

const themXeSchema = Joi.object({
  xe_key: Joi.string().required().max(50),
  ma_loai_xe: Joi.string().required().max(50),
  ma_mau: Joi.string().max(50).allow(null),
  so_khung: Joi.string().required().max(100),
  so_may: Joi.string().required().max(100),
  ma_kho_hien_tai: Joi.string().required().max(50),
  ngay_nhap: Joi.date().required(),
  gia_nhap: Joi.number().min(0).required(),
  ghi_chu: Joi.string().allow("", null),
});

/**
 * POST /api/vehicles/nhap-moi
 * Nhập xe mới vào kho
 * Quyền: NHAN_VIEN, QUAN_LY_CHI_NHANH, QUAN_LY_CTY, ADMIN
 */
router.post(
  '/nhap-moi',
  checkRole([ROLES.ADMIN, ROLES.NHAN_VIEN_BAN_HANG]),
  validate(themXeSchema),
 
  vehicleController.nhapXeMoi
);

/**
 * POST /api/vehicles/nhap-tu-don-hang
 * Nhập xe từ đơn hàng
 * Quyền: NHAN_VIEN, QUAN_LY_CHI_NHANH, QUAN_LY_CTY, ADMIN
 */
router.post(
  '/nhap-tu-don-hang/:ma_phieu/chi-tiet/:ct_id',
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN_BAN_HANG),
  vehicleController.nhapXeTuDonHang
);


/**
 * GET /api/vehicles/kho/:maKho
 * Lấy danh sách xe trong kho
 * Quyền: ALL
 */
router.get(
  '/kho/:maKho',
  vehicleController.getXeInKho
);

/**
 * GET /api/vehicles/:xeKey
 * Lấy thông tin chi tiết xe
 * Quyền: ALL
 */
router.get(
  '/:xeKey',
  vehicleController.getXeDetail
);

/**
 * POST /api/vehicles/check-duplicate
 * Kiểm tra trùng số khung, số máy
 * Quyền: ALL
 */
router.post(
  '/check-duplicate',
  vehicleController.checkDuplicate
);

/**
 * GET /api/vehicles/:xeKey/history
 * Lấy lịch sử giao dịch của xe
 * Quyền: ALL
 */
router.get(
  '/:xeKey/history',
  vehicleController.getXeHistory
);

module.exports = router;