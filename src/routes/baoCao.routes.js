const express = require("express");
const router = express.Router();
const baoCaoController = require("../controllers/baoCao.controller");
const { authenticate } = require("../middleware/auth");
const {
  checkPermission,
  checkAnyPermission,
} = require("../middleware/roleCheck");
const { warehouseIsolation } = require("../middleware/warehouseIsolation");

// Áp dụng xác thực và cách ly kho cho toàn bộ route báo cáo
router.use(authenticate, warehouseIsolation);

// ============================================================
// BÁO CÁO TỒN KHO
// ============================================================

/**
 * @route   GET /api/bao-cao/ton-kho/xe
 * @desc    Báo cáo tồn kho xe theo kho, loại xe, màu
 * @access  BAN_HANG, KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/ton-kho/xe",
  checkPermission("reports", "view"),
  baoCaoController.tonKhoXe,
);

/**
 * @route   GET /api/bao-cao/ton-kho/phu-tung
 * @desc    Báo cáo tồn kho phụ tùng
 * @access  BAN_HANG, KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/ton-kho/phu-tung",
  checkPermission("reports", "view"),
  baoCaoController.tonKhoPhuTung,
);

/**
 * @route   GET /api/bao-cao/ton-kho/tong-hop
 * @desc    Tổng hợp giá trị tồn kho toàn hệ thống
 * @access  KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/ton-kho/tong-hop",
  checkPermission("reports", "view"),
  baoCaoController.tonKhoTongHop,
);

// ============================================================
// BÁO CÁO DOANH THU
// ============================================================

/**
 * @route   GET /api/bao-cao/doanh-thu/theo-thang
 * @desc    Báo cáo doanh thu theo tháng
 * @access  BAN_HANG, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/doanh-thu/theo-thang",
  checkPermission("reports", "view"),
  baoCaoController.doanhThuTheoThang,
);

/**
 * @route   GET /api/bao-cao/doanh-thu/theo-kho
 * @desc    Báo cáo doanh thu theo kho
 * @access  KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/doanh-thu/theo-kho",
  checkPermission("reports", "view"),
  baoCaoController.doanhThuTheoKho,
);

/**
 * @route   GET /api/bao-cao/doanh-thu/theo-san-pham
 * @desc    Báo cáo doanh thu theo sản phẩm (xe/phụ tùng)
 * @access  BAN_HANG, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/doanh-thu/theo-san-pham",
  checkPermission("reports", "view"),
  baoCaoController.doanhThuTheoSanPham,
);

router.get(
  "/doanh-thu/tong-hop",
  checkPermission("reports", "view_financial"),
  baoCaoController.doanhThuTongHop,
);

/**
 * @route   GET /api/bao-cao/doanh-thu/chi-tiet
 * @desc    Báo cáo doanh thu chi tiết từng giao dịch
 * @access  BAN_HANG, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/doanh-thu/chi-tiet",
  checkPermission("reports", "view"),
  baoCaoController.doanhThuChiTiet,
);

/**
 * @route   GET /api/bao-cao/loi-nhuan
 * @desc    Báo cáo lợi nhuận (Doanh thu - Giá vốn)
 * @access  QUAN_LY, ADMIN (cần view_financial)
 */
router.get(
  "/loi-nhuan",
  checkPermission("reports", "view_financial"),
  baoCaoController.baoCaoLoiNhuan,
);

// ============================================================
// BÁO CÁO NHẬP XUẤT
// ============================================================

/**
 * @route   GET /api/bao-cao/nhap-xuat/xe
 * @desc    Báo cáo nhập xuất xe
 * @access  KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/nhap-xuat/xe",
  checkPermission("reports", "view"),
  baoCaoController.nhapXuatXe,
);

/**
 * @route   GET /api/bao-cao/nhap-xuat/phu-tung
 * @desc    Báo cáo nhập xuất phụ tùng
 * @access  KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/nhap-xuat/phu-tung",
  checkPermission("reports", "view"),
  baoCaoController.nhapXuatPhuTung,
);

/**
 * @route   GET /api/bao-cao/nhap-xuat/the-kho
 * @desc    Thẻ kho (xuất nhập tồn) của phụ tùng
 * @access  KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/nhap-xuat/the-kho",
  checkPermission("reports", "view"),
  baoCaoController.theKhoPhuTung,
);

/**
 * @route   GET /api/bao-cao/mua-hang/chi-tiet
 * @desc    Sổ chi tiết mua hàng theo nhà cung cấp
 * @access  KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/mua-hang/chi-tiet",
  checkPermission("reports", "view"),
  baoCaoController.chiTietMuaHang,
);

// ============================================================
// BÁO CÁO CHUYỂN KHO
// ============================================================

/**
 * @route   GET /api/bao-cao/chuyen-kho/tong-hop
 * @desc    Báo cáo chuyển kho tổng hợp
 * @access  KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/chuyen-kho/tong-hop",
  checkPermission("reports", "view"),
  baoCaoController.chuyenKhoTongHop,
);

/**
 * @route   GET /api/bao-cao/chuyen-kho/chi-tiet
 * @desc    Báo cáo chi tiết chuyển kho
 * @access  KHO, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/chuyen-kho/chi-tiet",
  checkPermission("reports", "view"),
  baoCaoController.chuyenKhoChiTiet,
);

// ============================================================
// BÁO CÁO CÔNG NỢ
// ============================================================

/**
 * @route   GET /api/bao-cao/cong-no/noi-bo
 * @desc    Báo cáo công nợ nội bộ giữa các kho
 * @access  KE_TOAN, QUAN_LY, ADMIN (cần view_financial)
 */
router.get(
  "/cong-no/noi-bo",
  checkPermission("reports", "view_financial"),
  baoCaoController.congNoNoiBo,
);

/**
 * @route   GET /api/bao-cao/cong-no/khach-hang
 * @desc    Báo cáo công nợ khách hàng
 * @access  BAN_HANG, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/cong-no/khach-hang",
  checkAnyPermission(["reports", "view_financial"], ["debt", "view"]),
  baoCaoController.congNoKhachHang,
);

// ============================================================
// BÁO CÁO THU CHI
// ============================================================

/**
 * @route   GET /api/bao-cao/thu-chi/theo-ngay
 * @desc    Báo cáo thu chi theo ngày
 * @access  KE_TOAN, QUAN_LY, ADMIN (cần view_financial)
 */
router.get(
  "/thu-chi/theo-ngay",
  checkPermission("reports", "view_financial"),
  baoCaoController.thuChiTheoNgay,
);

/**
 * @route   GET /api/bao-cao/thu-chi/tong-hop
 * @desc    Tổng hợp thu chi theo kho
 * @access  KE_TOAN, QUAN_LY, ADMIN (cần view_financial)
 */
router.get(
  "/thu-chi/tong-hop",
  checkPermission("reports", "view_financial"),
  baoCaoController.thuChiTongHop,
);

// ============================================================
// BÁO CÁO KHÁCH HÀNG
// ============================================================

/**
 * @route   GET /api/bao-cao/khach-hang/top-mua-hang
 * @desc    Top khách hàng mua nhiều nhất
 * @access  BAN_HANG, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/khach-hang/top-mua-hang",
  checkPermission("reports", "view"),
  baoCaoController.topKhachHang,
);

/**
 * @route   GET /api/bao-cao/khach-hang/lich-su-mua-hang
 * @desc    Lịch sử mua hàng của khách hàng
 * @access  BAN_HANG, KE_TOAN, QUAN_LY, ADMIN
 */
router.get(
  "/khach-hang/lich-su-mua-hang",
  checkPermission("reports", "view"),
  baoCaoController.lichSuMuaHang,
);

// ============================================================
// BÁO CÁO XUẤT EXCEL / PDF
// ============================================================

/**
 * @route   POST /api/bao-cao/xuat-excel
 * @desc    Xuất báo cáo ra file Excel
 * @access  Tất cả có quyền export
 */
router.post(
  "/xuat-excel",
  checkPermission("reports", "export"),
  baoCaoController.xuatExcel,
);

/**
 * @route   POST /api/bao-cao/xuat-pdf
 * @desc    Xuất báo cáo ra file PDF
 * @access  Tất cả có quyền export
 */
router.post(
  "/xuat-pdf",
  checkPermission("reports", "export"),
  baoCaoController.xuatPDF,
);

// ============================================================
// DASHBOARD & THỐNG KÊ TỔNG HỢP
// ============================================================

/**
 * @route   GET /api/bao-cao/dashboard
 * @desc    Dashboard tổng quan
 * @access  Tất cả role đã đăng nhập có quyền quan trọng
 */
router.get(
  "/dashboard",
  baoCaoController.dashboard,
);

/**
 * @route   GET /api/bao-cao/bieu-do/doanh-thu
 * @desc    Dữ liệu biểu đồ doanh thu
 * @access  Tất cả có quyền xem reports hoặc đơn hàng
 */
router.get(
  "/bieu-do/doanh-thu",
  checkAnyPermission(["reports", "view"], ["sales_orders", "view"]),
  baoCaoController.bieuDoDoanhThu,
);

/**
 * @route   GET /api/bao-cao/bieu-do/ton-kho
 * @desc    Dữ liệu biểu đồ tồn kho
 * @access  Tất cả có quyền xem reports hoặc kho
 */
router.get(
  "/bieu-do/ton-kho",
  checkAnyPermission(["reports", "view"], ["inventory", "view"]),
  baoCaoController.bieuDoTonKho,
);

module.exports = router;
