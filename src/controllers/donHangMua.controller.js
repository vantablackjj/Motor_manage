const donHangMuaService = require("../services/donHangMua.service");
const { sendSuccess, sendError } = require("../ultils/respone");
const logger = require("../ultils/logger");

class DonHangMuaController {
  // GET /api/v1/don-hang-mua
  async getDanhSach(req, res, next) {
    try {
      const filters = {
        trang_thai: req.query.trang_thai,
        ma_kho_nhap: req.query.ma_kho_nhap,
        tu_ngay: req.query.tu_ngay,
        den_ngay: req.query.den_ngay,
      };

      const data = await donHangMuaService.getDanhSach(filters);
      sendSuccess(res, data, "Lấy danh sách đơn hàng mua thành công");
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/don-hang-mua/:ma_phieu
  async getChiTiet(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const data = await donHangMuaService.getChiTiet(ma_phieu);

      if (!data) {
        return sendError(res, "Đơn hàng không tồn tại", 404);
      }

      sendSuccess(res, data, "Lấy chi tiết đơn hàng thành công");
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua
  async taoDonHang(req, res, next) {
    try {
      const data = {
        ...req.body,
        nguoi_tao: req.user.id,
      };

      const result = await donHangMuaService.taoDonHang(data);

      logger.info(`Đơn hàng ${result.ma_phieu} được tạo bởi ${req.user.id}`);

      sendSuccess(res, result, "Tạo đơn hàng mua thành công", 201);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua/:ma_phieu/chi-tiet
  async themPhuTung(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const chi_tiet = req.body;

      const result = await donHangMuaService.themPhuTung(ma_phieu, chi_tiet);

      sendSuccess(res, result, "Thêm phụ tùng vào đơn hàng thành công");
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua/:ma_phieu/gui-duyet
  async guiDuyet(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const result = await donHangMuaService.guiDuyet(ma_phieu, req.user.id);

      logger.info(`Đơn hàng ${ma_phieu} được gửi duyệt bởi ${req.user.id}`);

      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua/:ma_phieu/phe-duyet
  async pheDuyet(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const result = await donHangMuaService.pheDuyet(ma_phieu, req.user.id);

      logger.info(`Đơn hàng ${ma_phieu} được duyệt bởi ${req.user.id}`);

      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua/:ma_phieu/nhap-kho
  async nhapKho(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const { danh_sach_hang } = req.body; // Array of { id, so_luong_nhap, don_gia }

      const result = await donHangMuaService.nhapKho(
        ma_phieu,
        danh_sach_hang,
        req.user.id,
      );

      logger.info(`Đơn hàng ${ma_phieu} đã nhập kho bởi ${req.user.id}`);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async huyDuyet(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const username = req.user.id;
      const { ly_do } = req.body;

      const data = await donHangMuaService.tuChoiDonHang(
        ma_phieu,
        username,
        ly_do,
      );

      sendSuccess(res, data, "Đơn mua xe đã bị từ chối");
    } catch (err) {
      next(err);
    }
  }

  async inDonHang(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const DonHangMuaService = require("../services/donHangMua.service");
      const HoaDonBanService = require("../services/hoaDonBan.service");
      const PdfService = require("../services/pdf.service");

      let invoiceData = {};

      if (
        ma_phieu.startsWith("PNK") ||
        ma_phieu.startsWith("HD") ||
        ma_phieu.startsWith("CK")
      ) {
        // Fetch as a specific Invoice/Slip
        const hd = await HoaDonBanService.getById(ma_phieu);
        if (!hd) {
          return res.status(404).json({ message: "Hóa đơn không tồn tại" });
        }

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
          chiet_khau: hd.chiet_khau,
          vat: hd.tien_thue_gtgt,
          thanh_toan: hd.thanh_tien,
          ghi_chu: hd.ghi_chu,
          trang_thai: hd.trang_thai,

          chi_tiet_pt: (hd.chi_tiet_pt || []).map((item) => ({
            stt: item.stt,
            ten_hang_hoa: item.ten_pt || item.ma_pt,
            don_vi_tinh: item.don_vi_tinh || "Cái",
            so_luong: item.so_luong,
            don_gia: item.don_gia,
            thanh_tien: item.thanh_tien,
          })),
          chi_tiet_xe: (hd.chi_tiet_xe || []).map((item) => ({
            stt: item.stt,
            ten_hang_hoa: item.ten_pt || item.ma_pt, // For Mua Xe, it might be in ten_pt field
            don_vi_tinh: item.don_vi_tinh || "Chiếc",
            so_luong: item.so_luong,
            don_gia: item.don_gia,
            thanh_tien: item.thanh_tien,
          })),
        };
      } else {
        // Fetch as the whole Order
        const order = await DonHangMuaService.getChiTiet(ma_phieu);
        if (!order) {
          return res.status(404).json({ message: "Đơn hàng không tồn tại" });
        }

        // Filter only received items and recalculate totals
        const filteredChiTiet = (order.chi_tiet || []).filter(
          (item) => (item.so_luong_da_giao || 0) > 0,
        );

        // Recalculate total for filtered items
        const rawTongTien = filteredChiTiet.reduce(
          (sum, item) =>
            sum + Number(item.so_luong_da_giao) * Number(item.don_gia),
          0,
        );
        const vatRate = Number(order.vat_percentage || 0);
        const chietKhau = Number(order.chiet_khau || 0);
        const vatTien = (rawTongTien - chietKhau) * (vatRate / 100);
        const finalThanhToan = rawTongTien - chietKhau + vatTien;

        invoiceData = {
          so_hd: order.so_phieu,
          ngay_ban: order.ngay_dat_hang || order.created_at,
          loai_hoa_don:
            order.loai_don_hang === "MUA_HANG" ? "MUA_HANG" : "BAN_HANG",

          ten_ben_xuat: order.ten_ncc || order.ma_ncc,
          dia_chi_ben_xuat: order.dia_chi_ncc || "",
          sdt_ben_xuat: order.dien_thoai_ncc || "",

          ten_ben_nhap: order.ten_kho || order.ma_kho_nhap,
          dia_chi_ben_nhap: order.dia_chi_kho || "",

          ten_nguoi_tao: order.ten_nguoi_tao || order.nguoi_tao,
          tong_tien: rawTongTien,
          chiet_khau: chietKhau,
          vat: vatTien,
          thanh_toan: finalThanhToan,
          ghi_chu: order.ghi_chu || order.dien_giai,
          trang_thai: order.trang_thai,

          chi_tiet_pt: filteredChiTiet.map((item, idx) => ({
            stt: idx + 1,
            ten_hang_hoa: item.ten_pt || item.ma_hang_hoa,
            don_vi_tinh: item.don_vi_tinh || "Cái",
            so_luong: item.so_luong_da_giao,
            don_gia: item.don_gia,
            thanh_tien: item.so_luong_da_giao * item.don_gia,
          })),
        };
      }

      await PdfService.generateInvoicePdf(invoiceData, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DonHangMuaController();
