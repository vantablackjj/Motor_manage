const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { warehouseIsolation } = require("../middleware/warehouseIsolation");
const { validate } = require("../middleware/validation");
const { sendSuccess, sendError } = require("../utils/response");

router.use(authenticate, warehouseIsolation);
const chuyenKhoService = require("../services/chuyenKho.service");
const Joi = require("joi");

// Validation schemas
const taoPhieuSchema = Joi.object({
  ma_phieu: Joi.string().required().max(50),
  ngay_chuyen_kho: Joi.date().required(),
  ma_kho_xuat: Joi.string().required().max(50),
  ma_kho_nhap: Joi.string().required().max(50),
  dien_giai: Joi.string().allow("", null),
});
const themXeSchema = Joi.object({
  xe_key: Joi.string().required().max(50),
  ma_kho_hien_tai: Joi.string().required().max(50),
});
const themPhuTungSchema = Joi.object({
  ma_pt: Joi.string().required().max(50),
  ten_pt: Joi.string().required().max(200),
  don_vi_tinh: Joi.string().max(50),
  so_luong: Joi.number().integer().min(1).required(),
  don_gia: Joi.number().min(0).required(),
});

// GET /api/chuyen-kho - Danh sách phiếu chuyển kho
// KHO, QUAN_LY, KE_TOAN, ADMIN được xem
router.get(
  "/",
  authenticate,
  checkPermission("inventory", "view"),
  async (req, res, next) => {
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
  },
);

// GET /api/chuyen-kho/:ma_phieu - Chi tiết phiếu
router.get(
  "/:ma_phieu",
  authenticate,
  checkPermission("inventory", "view"),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const data = await chuyenKhoService.getChiTiet(ma_phieu);

      if (!data) {
        return sendError(res, "Phiếu chuyển kho không tồn tại", 404);
      }

      // Warehouse access check
      const user = req.user;
      const phieu = data.phieu || data;
      const ma_kho_xuat = phieu.ma_kho_xuat;
      const ma_kho_nhap = phieu.ma_kho_nhap;
      const isGlobalAdmin = user.vai_tro === "ADMIN";
      
      const allowedWarehouses = (user.allowed_warehouses || []).map(w => w.ma_kho);
      const hasAccess = user.ma_kho === ma_kho_xuat || 
                        user.ma_kho === ma_kho_nhap || 
                        allowedWarehouses.includes(ma_kho_xuat) || 
                        allowedWarehouses.includes(ma_kho_nhap);

      if (!isGlobalAdmin && !hasAccess) {
        return sendError(res, "Bạn không có quyền truy cập dữ liệu của kho xuất hoặc kho nhập này", 403);
      }

      sendSuccess(res, data, "Lấy chi tiết phiếu chuyển kho thành công");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * In Phiếu Chuyển Kho (PDF)
 */
router.get(
  "/:ma_phieu/in-phieu",
  authenticate,
  checkPermission("inventory", "view"),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const PdfService = require("../services/pdf.service");

      const data = await chuyenKhoService.getChiTiet(ma_phieu);
      if (!data)
        return res.status(404).json({ message: "Phiếu không tồn tại" });

      // Map data
      const currentData = data.phieu || data;
      const chiTietXe = (data.chi_tiet_xe || []).map((item, idx) => ({
        stt: idx + 1,
        ten_hang_hoa: item.ten_xe || item.xe_key || "Xe máy",
        don_vi_tinh: "Chiếc",
        so_luong: 1,
        don_gia: Number(item.don_gia || 0),
        thanh_tien: Number(item.don_gia || 0),
      }));

      const chiTietPt = (data.chi_tiet_pt || []).map((item, idx) => ({
        stt: idx + 1,
        ten_hang_hoa: item.ten_pt || item.ma_pt,
        don_vi_tinh: item.don_vi_tinh,
        so_luong: Number(item.so_luong),
        don_gia: Number(item.don_gia || 0),
        thanh_tien: Number(item.so_luong) * Number(item.don_gia || 0),
      }));

      const tongTien = [...chiTietXe, ...chiTietPt].reduce(
        (sum, item) => sum + item.thanh_tien,
        0,
      );

      const invoiceData = {
        so_hd: currentData.so_phieu,
        ngay_ban: currentData.ngay_chuyen_kho || currentData.created_at,
        loai_hoa_don: "CHUYEN_KHO",

        ten_ben_xuat: currentData.ten_kho_xuat || currentData.ma_kho_xuat,
        dia_chi_ben_xuat: currentData.dia_chi_kho_xuat || "",
        sdt_ben_xuat: currentData.sdt_kho_xuat || "",

        ten_ben_nhap: currentData.ten_kho_nhap || currentData.ma_kho_nhap,
        dia_chi_ben_nhap: currentData.dia_chi_kho_nhap || "",

        ten_nguoi_tao: currentData.ten_nguoi_tao || currentData.nguoi_tao,
        tong_tien: tongTien,
        ghi_chu: currentData.dien_giai,
        thanh_toan: tongTien,
        trang_thai: currentData.trang_thai,

        chi_tiet_xe: chiTietXe,
        chi_tiet_pt: chiTietPt,
      };

      await PdfService.generateInvoicePdf(invoiceData, res);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/chuyen-kho - Tạo phiếu mới
// KHO, QUAN_LY, ADMIN được tạo phiếu chuyển kho
router.post(
  "/",
  authenticate,
  checkPermission("inventory", "transfer"),
  validate(taoPhieuSchema),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        so_phieu: req.body.ma_phieu,
        nguoi_tao: req.user.username || req.user.ho_ten || String(req.user.id),
        created_by: req.user.id,
      };

      const result = await chuyenKhoService.taoPhieu(data);
      sendSuccess(res, result, "Tạo phiếu chuyển kho thành công", 201);
    } catch (error) {
      next(error);
    }
  },
);

// Thêm xe vào phiếu chuyển kho
router.post(
  "/:ma_phieu/xe",
  authenticate,
  checkPermission("inventory", "transfer"),
  validate(themXeSchema),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const result = await chuyenKhoService.themXe(ma_phieu, req.body);
      sendSuccess(res, result, "Thêm xe vào phiếu thành công");
    } catch (err) {
      next(err);
    }
  },
);

// Hủy phiếu chuyển kho - QUAN_LY và ADMIN
router.post(
  "/:so_phieu/huy",
  authenticate,
  checkPermission("inventory", "adjust"),
  async (req, res, next) => {
    try {
      const { so_phieu } = req.params;
      const { ly_do } = req.body;
      const nguoi_huy = req.user.username;

      const result = await chuyenKhoService.tuChoiDuyet(
        so_phieu,
        nguoi_huy,
        ly_do,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/chuyen-kho/:ma_phieu/phu-tung - Thêm phụ tùng
router.post(
  "/:ma_phieu/phu-tung",
  authenticate,
  checkPermission("inventory", "transfer"),
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
  },
);

// POST /api/v1/chuyen-kho/:ma_phieu/gui-duyet - Gửi duyệt
// KHO, QUAN_LY, ADMIN được gửi duyệt
router.post(
  "/:ma_phieu/gui-duyet",
  authenticate,
  checkPermission("inventory", "transfer"),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const result = await chuyenKhoService.guiDuyet(ma_phieu, req.user.id);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/chuyen-kho/:ma_phieu/phe-duyet - Phê duyệt
// Chỉ QUAN_LY và ADMIN được phê duyệt
router.post(
  "/:ma_phieu/phe-duyet",
  authenticate,
  checkPermission("inventory", "adjust"),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const result = await chuyenKhoService.pheDuyet(ma_phieu, req.user.id);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/chuyen-kho/:ma_phieu/nhap-kho - Nhập kho (Thực hiện chuyển)
// KHO, QUAN_LY, ADMIN thực hiện nhập kho
router.post(
  "/:ma_phieu/nhap-kho",
  authenticate,
  checkPermission("inventory", "transfer"),
  async (req, res, next) => {
    try {
      const { ma_phieu } = req.params;
      const { danh_sach_nhap } = req.body;
      const result = await chuyenKhoService.nhapKho(
        ma_phieu,
        req.user.id,
        danh_sach_nhap,
      );
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
