const express = require("express");
const router = express.Router();
const Joi = require("joi");

const controller = require("../controllers/donHangMuaXe.controller");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validate } = require("../middleware/validation");

const nhapXeMoiSchema = Joi.object({
  ngay_dat_hang: Joi.date().required(),
  ma_kho_nhap: Joi.string().required(),
  ma_ncc: Joi.string().required(),
  tong_tien: Joi.number(),

  nguoi_tao: Joi.string(),
  nguoi_gui: Joi.string(),
  nguoi_duyet: Joi.string(),
  created_at: Joi.date(),
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
 * KHO, KE_TOAN, QUAN_LY, ADMIN được xem
 */
router.get("/", checkPermission("purchase_orders", "view"), controller.getList);

/**
 * 2. Tạo đơn mua (header only - legacy)
 * KHO và ADMIN được tạo đơn mua xe
 */
router.post(
  "/",
  checkPermission("purchase_orders", "create"),
  validate(nhapXeMoiSchema),
  controller.create,
);

/**
 * 2.1 Tạo đơn mua KÈM CHI TIẾT (ATOMIC) - FIX RACE CONDITION
 * ⚠️ MUST be before /:ma_phieu routes to avoid route conflicts
 */
router.post(
  "/create-with-details",
  checkPermission("purchase_orders", "create"),
  validate(createWithDetailsSchema),
  controller.createWithDetails,
);

/**
 * 2.2 Xóa chi tiết đơn
 */
router.delete(
  "/:ma_phieu/chi-tiet/:id",
  checkPermission("purchase_orders", "edit"),
  controller.deleteChiTiet,
);

/**
 * 2.3 Thêm chi tiết đơn
 */
router.post(
  "/:ma_phieu/chi-tiet",
  checkPermission("purchase_orders", "edit"),
  validate(chiTietDonHang),
  controller.addChiTiet,
);

/**
 * 3. Gửi duyệt - người tạo gửi duyệt
 */
router.post(
  "/:ma_phieu/submit",
  checkPermission("purchase_orders", "create"),
  controller.submit,
);

/**
 * 4. Duyệt đơn - chỉ QUAN_LY, KE_TOAN, ADMIN
 */
router.post(
  "/:ma_phieu/approve",
  checkPermission("purchase_orders", "approve"),
  controller.approve,
);

/**
 * 4.1 Từ chối đơn - chỉ QUAN_LY, KE_TOAN, ADMIN
 */
router.post(
  "/:ma_phieu/reject",
  checkPermission("purchase_orders", "approve"),
  controller.reject,
);

/**
 * 5. Lấy chi tiết đơn
 */
router.get(
  "/:ma_phieu",
  checkPermission("purchase_orders", "view"),
  controller.detail,
);

/**
 * 6. Nhập kho xe (Receiving) - KHO thực hiện
 */
router.post(
  "/:ma_phieu/nhap-kho",
  checkPermission("inventory", "import"),
  controller.nhapKho,
);

/**
 * 7. In đơn hàng (PDF)
 */
router.get(
  "/:ma_phieu/in-don-hang",
  checkPermission("purchase_orders", "view"),
  async (req, res) => {
    try {
      const { ma_phieu } = req.params;
      const DonHangMuaXeService = require("../services/donHangMuaXe.service");
      const HoaDonBanService = require("../services/hoaDonBan.service");
      const PdfService = require("../services/pdf.service");

      let invoiceData = {};

      if (
        ma_phieu.startsWith("PNK") ||
        ma_phieu.startsWith("HD") ||
        ma_phieu.startsWith("CK")
      ) {
        const hd = await HoaDonBanService.getById(ma_phieu);
        if (!hd)
          return res.status(404).json({ message: "Phiếu không tồn tại" });

        invoiceData = {
          so_hd: hd.so_hd,
          ngay_ban: hd.ngay_ban || hd.created_at,
          loai_hoa_don: hd.loai_hoa_don,
          ten_ben_xuat: hd.ten_ben_xuat,
          dia_chi_ben_xuat: hd.dia_chi_ben_xuat,
          sdt_ben_xuat: hd.sdt_ben_xuat,
          ten_ben_nhap: hd.ten_ben_nhap,
          dia_chi_ben_nhap: hd.dia_chi_ben_nhap,
          ten_nguoi_tao: hd.nguoi_tao,
          tong_tien: hd.tong_tien,
          thanh_toan: hd.thanh_tien,
          ghi_chu: hd.ghi_chu,
          trang_thai: hd.trang_thai,
          chi_tiet_pt: (hd.chi_tiet_pt || []).map((item) => ({
            stt: item.stt,
            ten_hang_hoa: item.ten_pt || item.ma_pt,
            don_vi_tinh: item.don_vi_tinh || "Chiếc",
            so_luong: item.so_luong,
            don_gia: item.don_gia,
            thanh_tien: item.thanh_tien,
          })),
          chi_tiet_xe: (hd.chi_tiet_xe || []).map((item) => ({
            stt: item.stt,
            ten_hang_hoa: item.ten_pt || item.ma_pt,
            don_vi_tinh: "Chiếc",
            so_luong: item.so_luong,
            don_gia: item.don_gia,
            thanh_tien: item.thanh_tien,
          })),
        };
      } else {
        const order = await DonHangMuaXeService.getDetail(ma_phieu);
        if (!order)
          return res.status(404).json({ message: "Đơn hàng không tồn tại" });

        // Filter only received items and recalculate totals
        const filteredDetails = (order.chi_tiet || []).filter(
          (item) => (item.so_luong_da_giao || 0) > 0,
        );
        const rawTongTien = filteredDetails.reduce(
          (sum, item) =>
            sum + Number(item.so_luong_da_giao) * Number(item.don_gia),
          0,
        );

        invoiceData = {
          so_hd: order.so_phieu,
          ngay_ban: order.ngay_dat_hang || order.created_at,
          loai_hoa_don: "MUA_HANG",
          ten_ben_xuat: order.ten_ncc || order.ma_ncc,
          dia_chi_ben_xuat: order.dia_chi_ncc || "",
          sdt_ben_xuat: order.dien_thoai_ncc || "",
          ten_ben_nhap: order.ten_kho || order.ma_kho_nhap,
          dia_chi_ben_nhap: order.dia_chi_kho_nhap || "",
          ten_nguoi_tao: order.ten_nguoi_tao || order.nguoi_tao,
          tong_tien: rawTongTien,
          ghi_chu: order.ghi_chu,
          thanh_toan: rawTongTien,
          trang_thai: order.trang_thai,
          chi_tiet_pt: filteredDetails.map((item, idx) => ({
            stt: idx + 1,
            ten_hang_hoa: item.ten_xe || item.ten_loai_xe || item.ma_loai_xe,
            don_vi_tinh: "Chiếc",
            so_luong: item.so_luong_da_giao,
            don_gia: item.don_gia,
            thanh_tien: item.so_luong_da_giao * item.don_gia,
          })),
        };
      }

      await PdfService.generateInvoicePdf(invoiceData, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ message: err.message });
    }
  },
);

module.exports = router;
