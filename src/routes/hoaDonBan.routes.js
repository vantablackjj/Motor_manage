const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { warehouseIsolation } = require("../middleware/warehouseIsolation");
const { validate } = require("../middleware/validation");
const { sendSuccess, sendError } = require("../utils/response");

router.use(authenticate, warehouseIsolation);

const { pool } = require("../config/database");
const hoaDonBanService = require("../services/hoaDonBan.service");
const PdfService = require("../services/pdf.service");
const Joi = require("joi");

/* =====================================================
   JOI SCHEMA
===================================================== */

// Tạo hóa đơn (CHỈ HEADER)
const createHoaDonSchema = Joi.object({
  ngay_ban: Joi.date().required(),
  ma_kho_xuat: Joi.string().required(),
  ma_kh: Joi.string().required(),
  ghi_chu: Joi.string().allow(null, ""),
  chiet_khau: Joi.number().min(0).default(0),
  vat_percentage: Joi.number().min(0).max(100).default(0),
});

// Thêm xe vào hóa đơn
const themXeSchema = Joi.object({
  xe_key: Joi.string().required(),
  don_gia: Joi.number().positive().required(),
});

// Thêm phụ tùng
const themPhuTungSchema = Joi.object({
  ma_pt: Joi.string().required(),
  so_luong: Joi.number().integer().min(1).required(),
  don_gia: Joi.number().positive().required(),
});

/* =====================================================
   ROUTES
===================================================== */

/**
 * POST /hoa-don-ban
 * Tạo hóa đơn bán (header)
 * BAN_HANG, QUAN_LY, ADMIN
 */
router.post(
  "/",
  authenticate,
  checkPermission("sales_orders", "create"),
  validate(createHoaDonSchema),
  async (req, res) => {
    try {
      const data = {
        ...req.body,
        nguoi_tao: req.user.username,
      };

      const result = await hoaDonBanService.taoHoaDon(data);
      return sendSuccess(res, result, "Tạo hóa đơn bán thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * GET /hoa-don-ban
 * Danh sách hóa đơn - BAN_HANG được xem đơn của mình, QUAN_LY/KE_TOAN/ADMIN xem tất cả
 */
router.get(
  "/",
  authenticate,
  checkPermission("sales_orders", "view"),
  async (req, res) => {
    try {
      const result = await hoaDonBanService.getDanhSach(req.query);
      return sendSuccess(res, result, "Lấy danh sách hóa đơn thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * GET /hoa-don-ban/new-hd
 * Lấy mã hóa đơn mới (sử dụng cho giao diện tạo mới)
 */
router.get(
  "/new-hd",
  authenticate,
  checkPermission("sales_orders", "create"),
  async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(`
          SELECT 'HD' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_hd')::text, 6, '0') AS so_hd
        `);
        return sendSuccess(res, { so_hd: rows[0].so_hd });
      } finally {
        client.release();
      }
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * GET /hoa-don-ban/create
 * Lấy dữ liệu khởi tạo cho trang tạo mới hóa đơn
 */
router.get(
  "/create",
  authenticate,
  checkPermission("sales_orders", "create"),
  async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(`
          SELECT 'HD' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_hd')::text, 6, '0') AS so_hd
        `);
        return sendSuccess(res, {
          so_hd: rows[0].so_hd,
          ngay_ban: new Date(),
          nguoi_tao: req.user.username,
          trang_thai: "NHAP",
          chi_tiet_xe: [],
          chi_tiet_pt: [],
        });
      } finally {
        client.release();
      }
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * GET /hoa-don-ban/:so_hd
 * Chi tiết hóa đơn
 */
router.get(
  "/:so_hd",
  authenticate,
  checkPermission("sales_orders", "view"),
  async (req, res) => {
    try {
      const { so_hd } = req.params;

      // Xử lý các case đặc biệt (đã có route riêng ở trên)
      if (so_hd === "create" || so_hd === "new-hd") return;

      const result = await hoaDonBanService.getById(so_hd);
      
      // Warehouse access check
      const user = req.user;
      const ma_kho = result.ma_kho_xuat;
      const isGlobalAdmin = user.vai_tro === "ADMIN";
      const hasWarehouseAccess = user.ma_kho === ma_kho || 
        (user.allowed_warehouses && user.allowed_warehouses.some(w => w.ma_kho === ma_kho));

      if (!isGlobalAdmin && !hasWarehouseAccess) {
        return sendError(res, "Bạn không có quyền truy cập dữ liệu của kho này", 403);
      }

      return sendSuccess(res, result, "Lấy hóa đơn thành công");
    } catch (err) {
      const status = err.message.includes("Không tìm thấy") ? 404 : 500;
      return sendError(res, err.message, status);
    }
  },
);

/**
 * GET /hoa-don-ban/:so_hd/in-hoa-don
 * In hóa đơn (PDF)
 */
router.get(
  "/:so_hd/in-hoa-don",
  authenticate,
  checkPermission("invoices", "view"),
  async (req, res) => {
    try {
      const { so_hd } = req.params;

      const invoiceData = await hoaDonBanService.getById(so_hd);
      if (!invoiceData) {
        return sendError(res, "Hóa đơn không tồn tại");
      }

      await PdfService.generateInvoicePdf(invoiceData, res);
    } catch (err) {
      console.error("PDF Error:", err);
      if (!res.headersSent) {
        return sendError(res, "Lỗi khi tạo file PDF: " + err.message);
      }
    }
  },
);

/**
 * POST /hoa-don-ban/:so_hd/xe
 * Thêm xe vào hóa đơn - BAN_HANG, QUAN_LY, ADMIN
 */
router.post(
  "/:so_hd/xe",
  authenticate,
  checkPermission("sales_orders", "create"),
  validate(themXeSchema),
  async (req, res) => {
    try {
      const { so_hd } = req.params;
      const { xe_key, don_gia } = req.body;

      const result = await hoaDonBanService.themXe(so_hd, xe_key, don_gia);

      return sendSuccess(res, result, "Thêm xe vào hóa đơn thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * POST /hoa-don-ban/:so_hd/phu-tung
 * Thêm phụ tùng vào hóa đơn - BAN_HANG, QUAN_LY, ADMIN
 */
router.post(
  "/:so_hd/phu-tung",
  authenticate,
  checkPermission("sales_orders", "create"),
  validate(themPhuTungSchema),
  async (req, res) => {
    try {
      const { so_hd } = req.params;

      const result = await hoaDonBanService.themPhuTung(so_hd, req.body);

      return sendSuccess(res, result, "Thêm phụ tùng vào hóa đơn thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * PATCH /hoa-don-ban/:so_hd/gui-duyet
 * Gửi duyệt hóa đơn - BAN_HANG, QUAN_LY, ADMIN
 */
router.patch(
  "/:so_hd/gui-duyet",
  authenticate,
  checkPermission("sales_orders", "create"),
  async (req, res) => {
    try {
      const result = await hoaDonBanService.guiDuyet(
        req.params.so_hd,
        req.user.username,
      );

      return sendSuccess(res, result, "Gửi duyệt hóa đơn thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * PATCH /hoa-don-ban/:so_hd/phe-duyet
 * Phê duyệt hóa đơn - chỉ QUAN_LY, KE_TOAN, ADMIN
 */
router.patch(
  "/:so_hd/phe-duyet",
  authenticate,
  checkPermission("sales_orders", "approve"),
  async (req, res) => {
    try {
      const { so_tien_thu } = req.body;
      const result = await hoaDonBanService.pheDuyet(
        req.params.so_hd,
        req.user.username,
        so_tien_thu,
      );

      return sendSuccess(res, result, "Phê duyệt hóa đơn thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * PATCH /hoa-don-ban/:so_hd/tu-choi
 * Từ chối hóa đơn - chỉ QUAN_LY, KE_TOAN, ADMIN
 */
router.patch(
  "/:so_hd/tu-choi",
  authenticate,
  checkPermission("sales_orders", "approve"),
  async (req, res) => {
    try {
      const result = await hoaDonBanService.tuChoi(
        req.params.so_hd,
        req.user.username,
      );

      return sendSuccess(
        res,
        result,
        `Từ chối hóa đơn ${req.params.so_hd} thành công`,
      );
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * PATCH /hoa-don-ban/:so_hd/huy
 * Hủy hóa đơn - BAN_HANG (hủy đơn của mình), ADMIN
 */
router.patch(
  "/:so_hd/huy",
  authenticate,
  checkPermission("sales_orders", "edit"),
  async (req, res) => {
    try {
      const { ly_do } = req.body;

      const result = await hoaDonBanService.huy(
        req.params.so_hd,
        req.user.username,
        ly_do,
      );

      return sendSuccess(
        res,
        result,
        `Hủy hóa đơn ${req.params.so_hd} thành công`,
      );
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * DELETE /hoa-don-ban/:so_hd/chi-tiet/:stt
 * Xóa chi tiết hóa đơn - BAN_HANG, QUAN_LY, ADMIN
 */
router.delete(
  "/:so_hd/chi-tiet/:stt",
  authenticate,
  checkPermission("sales_orders", "edit"),
  async (req, res) => {
    try {
      const { so_hd, stt } = req.params;

      const result = await hoaDonBanService.xoaChiTiet(so_hd, Number(stt));

      return sendSuccess(
        res,
        result,
        `Xóa chi tiết hóa đơn ${so_hd} thành công`,
      );
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * PATCH /hoa-don-ban/:so_hd/cap-nhat-tai-chinh
 * Cập nhật VAT & chiết khấu - chỉ khi hóa đơn ở trạng thái NHAP
 * Role: BAN_HANG, QUAN_LY, ADMIN
 */
router.patch(
  "/:so_hd/cap-nhat-tai-chinh",
  authenticate,
  checkPermission("sales_orders", "edit"),
  validate(
    Joi.object({
      chiet_khau: Joi.number().min(0),
      vat_percentage: Joi.number().min(0).max(100),
      ghi_chu: Joi.string().allow(null, ""),
    }).min(1), // Ít nhất 1 field cần được gửi
  ),
  async (req, res) => {
    try {
      const { so_hd } = req.params;
      const result = await hoaDonBanService.updateVatChietKhau(so_hd, req.body);
      return sendSuccess(
        res,
        result,
        "Cập nhật thông tin tài chính thành công",
      );
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * PATCH /hoa-don-ban/:so_hd/gui-duyet-giao
 * Gửi duyệt giao hàng - BAN_HANG, QUAN_LY, ADMIN
 */
router.patch(
  "/:so_hd/gui-duyet-giao",
  authenticate,
  checkPermission("sales_orders", "edit"),
  async (req, res) => {
    try {
      const result = await hoaDonBanService.guiDuyetGiao(
        req.params.so_hd,
        req.user.id,
      );

      return sendSuccess(res, result, "Gửi duyệt giao hàng thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * PATCH /hoa-don-ban/:so_hd/phe-duyet-giao
 * Phê duyệt giao hàng - chỉ QUAN_LY, ADMIN
 */
router.patch(
  "/:so_hd/phe-duyet-giao",
  authenticate,
  checkPermission("sales_orders", "approve"),
  async (req, res) => {
    try {
      const { ghi_chu } = req.body;
      const result = await hoaDonBanService.pheDuyetGiao(
        req.params.so_hd,
        req.user.id,
        ghi_chu,
      );

      return sendSuccess(res, result, "Phê duyệt giao hàng thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

/**
 * PATCH /hoa-don-ban/:so_hd/xac-nhan-da-giao
 * Xác nhận đã giao hàng - BAN_HANG, QUAN_LY, ADMIN
 */
router.patch(
  "/:so_hd/xac-nhan-da-giao",
  authenticate,
  checkPermission("sales_orders", "edit"),
  async (req, res) => {
    try {
      const result = await hoaDonBanService.xacNhanDaGiao(
        req.params.so_hd,
        req.user.id,
      );

      return sendSuccess(res, result, "Xác nhận đã giao hàng thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);

module.exports = router;
