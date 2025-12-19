const express = require('express');
const router = express.Router();
const baoCaoController = require('../controllers/baoCao.controller');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================================
// BÁO CÁO TỒN KHO
// ============================================================

/**
 * @route   GET /api/bao-cao/ton-kho/xe
 * @desc    Báo cáo tồn kho xe theo kho, loại xe, màu
 * @access  Private (NHAN_VIEN trở lên)
 * @query   ma_kho, ma_loai_xe, ma_mau, ngay_tinh
 */
router.get('/ton-kho/xe',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.tonKhoXe
);

/**
 * @route   GET /api/bao-cao/ton-kho/phu-tung
 * @desc    Báo cáo tồn kho phụ tùng
 * @access  Private (NHAN_VIEN trở lên)
 * @query   ma_kho, nhom_pt, canh_bao (true/false)
 */
router.get('/ton-kho/phu-tung',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.tonKhoPhuTung
);

/**
 * @route   GET /api/bao-cao/ton-kho/tong-hop
 * @desc    Tổng hợp giá trị tồn kho toàn hệ thống
 * @access  Private (QUAN_LY_CTY trở lên)
 * @query   ngay_tinh
 */
router.get('/ton-kho/tong-hop',
  authenticate,
  authorize(['QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.tonKhoTongHop
);

// ============================================================
// BÁO CÁO DOANH THU
// ============================================================

/**
 * @route   GET /api/bao-cao/doanh-thu/theo-thang
 * @desc    Báo cáo doanh thu theo tháng
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   nam, ma_kho
 */
router.get('/doanh-thu/theo-thang',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.doanhThuTheoThang
);

/**
 * @route   GET /api/bao-cao/doanh-thu/theo-kho
 * @desc    Báo cáo doanh thu theo kho
 * @access  Private (QUAN_LY_CTY trở lên)
 * @query   tu_ngay, den_ngay
 */
router.get('/doanh-thu/theo-kho',
  authenticate,
  authorize(['QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.doanhThuTheoKho
);

/**
 * @route   GET /api/bao-cao/doanh-thu/theo-san-pham
 * @desc    Báo cáo doanh thu theo sản phẩm (xe/phụ tùng)
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   tu_ngay, den_ngay, ma_kho, loai ('XE' hoặc 'PHU_TUNG')
 */
router.get('/doanh-thu/theo-san-pham',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.doanhThuTheoSanPham
);

/**
 * @route   GET /api/bao-cao/doanh-thu/tong-hop
 * @desc    Tổng hợp doanh thu toàn hệ thống
 * @access  Private (QUAN_LY_CTY trở lên)
 * @query   tu_ngay, den_ngay
 */
router.get('/doanh-thu/tong-hop',
  authenticate,
  authorize(['QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.doanhThuTongHop
);

// ============================================================
// BÁO CÁO NHẬP XUẤT
// ============================================================

/**
 * @route   GET /api/bao-cao/nhap-xuat/xe
 * @desc    Báo cáo nhập xuất xe
 * @access  Private (NHAN_VIEN trở lên)
 * @query   tu_ngay, den_ngay, ma_kho, loai_giao_dich
 */
router.get('/nhap-xuat/xe',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.nhapXuatXe
);

/**
 * @route   GET /api/bao-cao/nhap-xuat/phu-tung
 * @desc    Báo cáo nhập xuất phụ tùng
 * @access  Private (NHAN_VIEN trở lên)
 * @query   tu_ngay, den_ngay, ma_kho, ma_pt
 */
router.get('/nhap-xuat/phu-tung',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.nhapXuatPhuTung
);

/**
 * @route   GET /api/bao-cao/nhap-xuat/the-kho
 * @desc    Thẻ kho (xuất nhập tồn) của phụ tùng
 * @access  Private (NHAN_VIEN trở lên)
 * @query   tu_ngay, den_ngay, ma_kho, ma_pt
 */
router.get('/nhap-xuat/the-kho',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.theKhoPhuTung
);

// ============================================================
// BÁO CÁO CHUYỂN KHO
// ============================================================

/**
 * @route   GET /api/bao-cao/chuyen-kho/tong-hop
 * @desc    Báo cáo chuyển kho tổng hợp
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   tu_ngay, den_ngay, ma_kho_xuat, ma_kho_nhap
 */
router.get('/chuyen-kho/tong-hop',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.chuyenKhoTongHop
);

/**
 * @route   GET /api/bao-cao/chuyen-kho/chi-tiet
 * @desc    Báo cáo chi tiết chuyển kho
 * @access  Private (NHAN_VIEN trở lên)
 * @query   tu_ngay, den_ngay, ma_kho
 */
router.get('/chuyen-kho/chi-tiet',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.chuyenKhoChiTiet
);

// ============================================================
// BÁO CÁO CÔNG NỢ
// ============================================================

/**
 * @route   GET /api/bao-cao/cong-no/noi-bo
 * @desc    Báo cáo công nợ nội bộ giữa các kho
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   ma_kho, ngay_tinh
 */
router.get('/cong-no/noi-bo',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.congNoNoiBo
);

/**
 * @route   GET /api/bao-cao/cong-no/khach-hang
 * @desc    Báo cáo công nợ khách hàng
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   ma_kho, ma_kh, tu_ngay, den_ngay
 */
router.get('/cong-no/khach-hang',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.congNoKhachHang
);

// ============================================================
// BÁO CÁO THU CHI
// ============================================================

/**
 * @route   GET /api/bao-cao/thu-chi/theo-ngay
 * @desc    Báo cáo thu chi theo ngày
 * @access  Private (NHAN_VIEN trở lên)
 * @query   tu_ngay, den_ngay, ma_kho, loai ('THU' hoặc 'CHI')
 */
router.get('/thu-chi/theo-ngay',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.thuChiTheoNgay
);

/**
 * @route   GET /api/bao-cao/thu-chi/tong-hop
 * @desc    Tổng hợp thu chi theo kho
 * @access  Private (QUAN_LY_CTY trở lên)
 * @query   tu_ngay, den_ngay
 */
router.get('/thu-chi/tong-hop',
  authenticate,
  authorize(['QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.thuChiTongHop
);

// ============================================================
// BÁO CÁO KHÁCH HÀNG
// ============================================================

/**
 * @route   GET /api/bao-cao/khach-hang/top-mua-hang
 * @desc    Top khách hàng mua nhiều nhất
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   tu_ngay, den_ngay, ma_kho, limit
 */
router.get('/khach-hang/top-mua-hang',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.topKhachHang
);

/**
 * @route   GET /api/bao-cao/khach-hang/lich-su-mua-hang
 * @desc    Lịch sử mua hàng của khách hàng
 * @access  Private (NHAN_VIEN trở lên)
 * @query   ma_kh, tu_ngay, den_ngay
 */
router.get('/khach-hang/lich-su-mua-hang',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.lichSuMuaHang
);

// ============================================================
// BÁO CÁO XUẤT EXCEL
// ============================================================

/**
 * @route   POST /api/bao-cao/xuat-excel
 * @desc    Xuất báo cáo ra file Excel
 * @access  Private (NHAN_VIEN trở lên)
 * @body    { loai_bao_cao, params: {...} }
 */
router.post('/xuat-excel',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.xuatExcel
);

/**
 * @route   POST /api/bao-cao/xuat-pdf
 * @desc    Xuất báo cáo ra file PDF
 * @access  Private (NHAN_VIEN trở lên)
 * @body    { loai_bao_cao, params: {...} }
 */
router.post('/xuat-pdf',
  authenticate,
  authorize(['NHAN_VIEN', 'QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.xuatPDF
);

// ============================================================
// DASHBOARD & THỐNG KÊ TỔNG HỢP
// ============================================================

/**
 * @route   GET /api/bao-cao/dashboard
 * @desc    Dashboard tổng quan (doanh thu, tồn kho, công nợ...)
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   ma_kho, tu_ngay, den_ngay
 */
router.get('/dashboard',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.dashboard
);

/**
 * @route   GET /api/bao-cao/bieu-do/doanh-thu
 * @desc    Dữ liệu biểu đồ doanh thu
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   nam, ma_kho
 */
router.get('/bieu-do/doanh-thu',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.bieuDoDoanhThu
);

/**
 * @route   GET /api/bao-cao/bieu-do/ton-kho
 * @desc    Dữ liệu biểu đồ tồn kho
 * @access  Private (QUAN_LY_CHI_NHANH trở lên)
 * @query   ma_kho
 */
router.get('/bieu-do/ton-kho',
  authenticate,
  authorize(['QUAN_LY_CHI_NHANH', 'QUAN_LY_CTY', 'ADMIN']),
  baoCaoController.bieuDoTonKho
);

module.exports = router;