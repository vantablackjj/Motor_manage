const BulkExportService = require("../services/bulkExport.service");
const BrandService = require("../services/brands.service");
const ColorService = require("../services/color.service");
const KhoService = require("../services/kho.service");
const NoiSxService = require("../services/noiSx.service");
const VehicleTypeService = require("../services/modelCar.service");
const KhachHangService = require("../services/khachHang.service");
const PhuTungService = require("../services/phuTung.service");
const ThuChiService = require("../services/thuChi.service");
const DonHangMuaService = require("../services/donHangMua.service");
const HoaDonBanService = require("../services/hoaDonBan.service");
const ChuyenKhoService = require("../services/chuyenKho.service");
const logger = require("../ultils/logger");

class BulkExportController {
  // --- MASTER DATA ---

  static async exportBrands(req, res, next) {
    try {
      const data = await BrandService.getAll();
      const columns = [
        { header: "Mã Nhãn Hiệu", key: "ma_nh", width: 15 },
        { header: "Tên Nhãn Hiệu", key: "ten_nh", width: 30 },
        { header: "Ghi Chú", key: "ghi_chu", width: 30 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Danh_sach_Nhan_hieu.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportColors(req, res, next) {
    try {
      const data = await ColorService.getAll();
      const columns = [
        { header: "Mã Màu", key: "ma_mau", width: 15 },
        { header: "Tên Màu", key: "ten_mau", width: 25 },
        { header: "Giá Trị Màu", key: "gia_tri", width: 15 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Danh_sach_Mau.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportWarehouses(req, res, next) {
    try {
      const data = await KhoService.getAll();
      const columns = [
        { header: "Mã Kho", key: "ma_kho", width: 15 },
        { header: "Tên Kho", key: "ten_kho", width: 30 },
        { header: "Địa Chỉ", key: "dia_chi", width: 40 },
        { header: "Điện Thoại", key: "dien_thoai", width: 15 },
        { header: "Loại Kho", key: "loai_kho", width: 15 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Danh_sach_Kho.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportOrigins(req, res, next) {
    try {
      const data = await NoiSxService.getAll();
      const columns = [
        { header: "Mã Nơi SX", key: "ma", width: 15 },
        { header: "Tên Nơi Sản Xuất", key: "ten_noi_sx", width: 30 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Danh_sach_Noi_San_Xuat.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportVehicleTypes(req, res, next) {
    try {
      const data = await VehicleTypeService.getAll();
      const columns = [
        { header: "Mã Loại", key: "ma_loai", width: 15 },
        { header: "Tên Loại Xe", key: "ten_loai", width: 30 },
        { header: "Mã Nhãn Hiệu", key: "ma_nh", width: 15 },
        { header: "Tên Nhãn Hiệu", key: "ten_nh", width: 20 },
        { header: "Nơi Sản Xuất", key: "noi_sx", width: 20 },
        { header: "Loại Hình", key: "loai_hinh", width: 15 },
        { header: "Giá Nhập", key: "gia_nhap", width: 15 },
        { header: "Giá Bán", key: "gia_ban", width: 15 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Danh_sach_Loai_Xe.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportCustomers(req, res, next) {
    try {
      const data = await KhachHangService.getAll();
      const columns = [
        { header: "Mã KH", key: "ma_kh", width: 15 },
        { header: "Họ Tên", key: "ho_ten", width: 30 },
        { header: "Điện Thoại", key: "dien_thoai", width: 15 },
        { header: "Địa Chỉ", key: "dia_chi", width: 40 },
        { header: "Email", key: "email", width: 25 },
        { header: "Là NCC", key: "la_ncc", width: 10 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Danh_sach_Khach_Hang.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportParts(req, res, next) {
    try {
      const data = await PhuTungService.getAll();
      const columns = [
        { header: "Mã PT", key: "ma_pt", width: 15 },
        { header: "Tên Phụ Tùng", key: "ten_pt", width: 30 },
        { header: "ĐVT", key: "don_vi_tinh", width: 10 },
        { header: "Nhóm PT", key: "nhom_pt", width: 20 },
        { header: "Giá Nhập", key: "gia_nhap", width: 15 },
        { header: "Giá Bán", key: "gia_ban", width: 15 },
        { header: "VAT (%)", key: "vat", width: 10 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Danh_sach_Phu_Tung.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  // --- TRANSACTIONS ---

  static async exportThuChi(req, res, next) {
    try {
      const data = await ThuChiService.getAll(req.query);
      const columns = [
        { header: "Số Phiếu", key: "so_phieu", width: 20 },
        { header: "Loại", key: "loai", width: 10 },
        { header: "Số Tiền", key: "so_tien", width: 15 },
        { header: "Ngày Giao Dịch", key: "ngay_giao_dich", width: 20 },
        { header: "Mã Kho", key: "ma_kho", width: 15 },
        { header: "Đối Tượng", key: "ten_kh", width: 25 },
        { header: "Diễn Giải", key: "dien_giai", width: 30 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Bao_cao_Thu_Chi.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportNhapKho(req, res, next) {
    try {
      // Nhập kho ở đây là chi tiết đơn hàng mua
      const data = await DonHangMuaService.getAllDetails(req.query);
      const columns = [
        { header: "Mã Phiếu", key: "ma_phieu", width: 20 },
        { header: "Ngày Nhập", key: "ngay_lap", width: 20 },
        { header: "Mã PT", key: "ma_pt", width: 15 },
        { header: "Tên Phụ Tùng", key: "ten_pt", width: 30 },
        { header: "Số Lượng", key: "so_luong", width: 12 },
        { header: "Đơn Giá", key: "don_gia", width: 15 },
        { header: "Thành Tiền", key: "thanh_tien", width: 15 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Chi_tiet_Nhap_Kho_PT.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportXuatKho(req, res, next) {
    try {
      // Xuất kho ở đây là chi tiết hóa đơn bán
      const data = await HoaDonBanService.getAllDetails(req.query);
      const columns = [
        { header: "Số Hóa Đơn", key: "ma_hd", width: 20 },
        { header: "Ngày Xuất", key: "ngay_lap", width: 20 },
        { header: "Mã PT", key: "ma_pt", width: 15 },
        { header: "Tên Phụ Tùng", key: "ten_pt", width: 30 },
        { header: "Số Lượng", key: "so_luong", width: 12 },
        { header: "Đơn Giá", key: "don_gia", width: 15 },
        { header: "Thành Tiền", key: "thanh_tien", width: 15 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Chi_tiet_Xuat_Kho_PT.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportTransferXe(req, res, next) {
    try {
      const data = await ChuyenKhoService.getAllTransferXe(req.query);
      const columns = [
        { header: "Mã Phiếu", key: "ma_phieu", width: 20 },
        { header: "Ngày Chuyển", key: "ngay_tao", width: 20 },
        { header: "Xe Key (VIN/Engine)", key: "xe_key", width: 25 },
        { header: "Từ Kho", key: "tu_ma_kho", width: 15 },
        { header: "Đến Kho", key: "den_ma_kho", width: 15 },
        { header: "Người Chuyển", key: "nguoi_tao_ten", width: 20 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Chuyen_Kho_Xe.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportTransferPT(req, res, next) {
    try {
      const data = await ChuyenKhoService.getAllTransferPT(req.query);
      const columns = [
        { header: "Mã Phiếu", key: "ma_phieu", width: 20 },
        { header: "Ngày Chuyển", key: "ngay_tao", width: 20 },
        { header: "Mã PT", key: "ma_pt", width: 15 },
        { header: "Tên Phụ Tùng", key: "ten_pt", width: 30 },
        { header: "Số Lượng", key: "so_luong", width: 12 },
        { header: "Từ Kho", key: "tu_ma_kho", width: 15 },
        { header: "Đến Kho", key: "den_ma_kho", width: 15 },
      ];
      await BulkExportService.exportToExcel(
        res,
        data,
        columns,
        "Chuyen_Kho_Phu_Tung.xlsx"
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BulkExportController;
