const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { sendSuccess, sendError } = require("../ultils/respone");
const chuyenKhoService = require("../services/chuyenKho.service");
const Joi = require("joi");
const { ROLES } = require("../config/constants");



// Validation schemas
const taoPhieuSchema = Joi.object({
  ma_phieu: Joi.string().required().max(50),
  ngay_chuyen_kho: Joi.date().required(),
  ma_kho_xuat: Joi.string().required().max(50),
  ma_kho_nhap: Joi.string().required().max(50),
  dien_giai: Joi.string().allow("", null),
});
const themXeSchema = Joi.object({
  xe_key : Joi.string().required().max(50),
  ma_kho_hien_tai:Joi.string().required().max(50),
})
const themPhuTungSchema = Joi.object({
  ma_pt: Joi.string().required().max(50),
  ten_pt: Joi.string().required().max(200),
  don_vi_tinh: Joi.string().max(50),
  so_luong: Joi.number().integer().min(1).required(),
  don_gia: Joi.number().min(0).required(),
});

// GET /api/chuyen-kho - Danh sách phiếu chuyển kho
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filters = {
      trang_thai: req.query.trang_thai,
      ma_kho_xuat: req.query.ma_kho_xuat,
      ma_kho_nhap: req.query.ma_kho_nhap,
      tu_ngay: req.query.tu_ngay,
      den_ngay: req.query.den_ngay,
    };

    const data = await chuyenKhoService.getDanhSach(filters);
    sendSuccess(res, data, "Lấy danh sách phiếu chuyển kho thành công");
  } catch (error) {
    next(error);
  }
});

// GET /api/chuyen-kho/:ma_phieu - Chi tiết phiếu
router.get("/:ma_phieu", authenticate, async (req, res, next) => {
  try {
    const { ma_phieu } = req.params;
    const data = await chuyenKhoService.getChiTiet(ma_phieu);

    if (!data) {
      return sendError(res, "Phiếu chuyển kho không tồn tại", 404);
    }

    sendSuccess(res, data, "Lấy chi tiết phiếu chuyển kho thành công");
  } catch (error) {
    next(error);
  }
});

// POST /api/chuyen-kho - Tạo phiếu mới
router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  validate(taoPhieuSchema),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        nguoi_tao: req.user.username,
      };
     
      const result = await chuyenKhoService.taoPhieu(data);
      sendSuccess(res, result, "Tạo phiếu chuyển kho thành công", 201);
    } catch (error) {
      next(error);
    } 
  }
);

router.post(
  '/:ma_phieu/xe',
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  validate(themXeSchema),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const result = await chuyenKhoService.themXe(ma_phieu, req.body);
       sendSuccess(res, result, "Thêm  xe vào phiếu thành công");
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:so_phieu/huy',
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY),
  async (req, res, next) => {
    try {
      const { so_phieu } = req.params;
      const { ly_do } = req.body;
      const nguoi_huy = req.user.username;

      const result = await chuyenKhoService.tuChoiDuyet(
        so_phieu,
        nguoi_huy,
        ly_do
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

// POST /api/chuyen-kho/:ma_phieu/phu-tung - Thêm phụ tùng
router.post(
  "/:ma_phieu/phu-tung",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  validate(themPhuTungSchema),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const chi_tiet = req.body;

      const result = await chuyenKhoService.themPhuTung(ma_phieu, chi_tiet);
      sendSuccess(res, result, "Thêm phụ tùng vào phiếu thành công");
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/chuyen-kho/:ma_phieu/gui-duyet - Gửi duyệt
router.post(
  "/:ma_phieu/gui-duyet",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const result = await chuyenKhoService.guiDuyet(
        ma_phieu,
        req.user.username
      );
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/chuyen-kho/:ma_phieu/phe-duyet - Phê duyệt
router.post(
  "/:ma_phieu/phe-duyet",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const result = await chuyenKhoService.pheDuyet(
        ma_phieu,
        req.user.username
      );
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
);



module.exports = router;
