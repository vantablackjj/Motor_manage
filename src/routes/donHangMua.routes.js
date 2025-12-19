const express = require('express');
const router = express.Router();
const donHangMuaController = require('../controllers/donHangMua.controller');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validation');
const Joi = require('joi');
const { ROLES } = require('../config/constants');

// Validation schemas
const taoDonHangSchema = Joi.object({
  ma_phieu: Joi.string().required().max(50),
  ngay_dat_hang: Joi.date().required(),
  ma_kho_nhap: Joi.string().required().max(50),
  ma_ncc: Joi.string().required().max(50),
  dien_giai: Joi.string().allow('', null)
});

const themPhuTungSchema = Joi.object({
  ma_pt: Joi.string().required().max(50),
  ten_pt: Joi.string().required().max(200),
  don_vi_tinh: Joi.string().required().max(50),
  so_luong: Joi.number().integer().min(1).required(),
  don_gia: Joi.number().min(0).required()
});

// Routes
router.get('/', 
  authenticate, 
  donHangMuaController.getDanhSach
);

router.get('/:ma_phieu', 
  authenticate, 
  donHangMuaController.getChiTiet
);

router.post('/', 
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH, ROLES.NHAN_VIEN),
  validate(taoDonHangSchema),
  donHangMuaController.taoDonHang
);

router.post('/:ma_phieu/chi-tiet',
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH, ROLES.NHAN_VIEN),
  validate(themPhuTungSchema),
  donHangMuaController.themPhuTung
);

router.post('/:ma_phieu/gui-duyet',
  authenticate,
  checkRole(ROLES.ADMIN,ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH, ROLES.NHAN_VIEN),
  donHangMuaController.guiDuyet
);

router.post('/:ma_phieu/phe-duyet',
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  donHangMuaController.pheDuyet
);

router.post("/ma_phieu/huy-duyet",
  authenticate,
  checkRole(ROLES.ADMIN,ROLES.QUAN_LY_CTY),
  donHangMuaController.huyduyet
)

module.exports = router;
