const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { sendSuccess, sendError } = require("../ultils/respone");

const hoaDonBanService = require("../services/hoaDonBan.service");
const PdfService = require("../services/pdf.service");
const Joi = require("joi");
const { ROLES } = require("../config/constants");

/* =====================================================
   JOI SCHEMA
===================================================== */

// Tạo hóa đơn (CHỈ HEADER)
const createHoaDonSchema = Joi.object({
  ngay_ban: Joi.date().required(),
  ma_kho_xuat: Joi.string().required(),
  ma_kh: Joi.string().required(),
  ghi_chu: Joi.string().allow(null, ""),
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
 */
router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN),
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
 * Danh sách hóa đơn
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const result = await hoaDonBanService.getDanhSach(req.query);
    return sendSuccess(res, result, "Lấy danh sách hóa đơn thành công");
  } catch (err) {
    return sendError(res, err.message);
  }
});

/**
 * GET /hoa-don-ban/:so_hd
 * Chi tiết hóa đơn
 */
router.get("/:so_hd", authenticate, async (req, res) => {
  try {
    const result = await hoaDonBanService.getById(req.params.so_hd);

    return sendSuccess(res, result, "Lấy hóa đơn thành công");
  } catch (err) {
    return sendError(res, err.message);
  }
});

/**
 * GET /hoa-don-ban/:so_hd/in-hoa-don
 * In hóa đơn (PDF)
 */
router.get("/:so_hd/in-hoa-don", authenticate, async (req, res) => {
  try {
    const { so_hd } = req.params;

    // Check if invoice exists and get data
    const invoiceData = await hoaDonBanService.getById(so_hd);
    if (!invoiceData) {
      return sendError(res, "Hóa đơn không tồn tại");
    }

    // Generate PDF
    await PdfService.generateInvoicePdf(invoiceData, res);
  } catch (err) {
    console.error("PDF Error:", err);
    // If headers sent, we can't send JSON error, but stream might be corrupted
    if (!res.headersSent) {
      return sendError(res, "Lỗi khi tạo file PDF: " + err.message);
    }
  }
});

/**
 * POST /hoa-don-ban/:so_hd/xe
 * Thêm xe vào hóa đơn
 */
router.post(
  "/:so_hd/xe",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN),
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
 * Thêm phụ tùng vào hóa đơn
 */
router.post(
  "/:so_hd/phu-tung",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN),
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
 * Gửi duyệt hóa đơn
 */
router.patch(
  "/:so_hd/gui-duyet",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN),
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
 * Phê duyệt hóa đơn
 */
router.patch(
  "/:so_hd/phe-duyet",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY),
  async (req, res) => {
    try {
      const result = await hoaDonBanService.pheDuyet(
        req.params.so_hd,
        req.user.username,
      );

      return sendSuccess(res, result, "Phê duyệt hóa đơn thành công");
    } catch (err) {
      return sendError(res, err.message);
    }
  },
);
/**
 * PATCH /hoa-don-ban/:so_hd/tu-choi
 * Từ chối hóa đơn (quản lý)
 */
router.patch(
  "/:so_hd/tu-choi",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY),
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
 * Hủy hóa đơn (nhân viên tạo / admin)
 */
router.patch(
  "/:so_hd/huy",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN),
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
 */
router.delete(
  "/:so_hd/chi-tiet/:stt",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN),
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
 * PATCH /hoa-don-ban/:so_hd/gui-duyet-giao
 * Gửi duyệt giao hàng (sau khi đã xuất kho)
 */
router.patch(
  "/:so_hd/gui-duyet-giao",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN, ROLES.QUAN_LY_CHI_NHANH),
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
 * Phê duyệt giao hàng (quản lý)
 */
router.patch(
  "/:so_hd/phe-duyet-giao",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CHI_NHANH, ROLES.QUAN_LY_CTY),
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
 * Xác nhận đã giao hàng (sau khi đã duyệt)
 */
router.patch(
  "/:so_hd/xac-nhan-da-giao",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.NHAN_VIEN, ROLES.QUAN_LY_CHI_NHANH),
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
