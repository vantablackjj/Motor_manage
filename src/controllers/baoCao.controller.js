const baoCaoService = require("../services/baoCao.service");
const { generateExcel } = require("../ultils/excelHelper");

class BaoCaoController {
  // Inventory
  async tonKhoXe(req, res) {
    try {
      const data = await baoCaoService.tonKhoXe(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async tonKhoPhuTung(req, res) {
    try {
      const data = await baoCaoService.tonKhoPhuTung(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async tonKhoTongHop(req, res) {
    try {
      const data = await baoCaoService.tonKhoTongHop();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Revenue
  async doanhThuTheoThang(req, res) {
    try {
      const data = await baoCaoService.doanhThuTheoThang(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async doanhThuTheoKho(req, res) {
    try {
      const data = await baoCaoService.doanhThuTheoKho(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async doanhThuTheoSanPham(req, res) {
    try {
      const data = await baoCaoService.doanhThuTheoSanPham(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async doanhThuTongHop(req, res) {
    try {
      const data = await baoCaoService.doanhThuTongHop(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Import/Export
  async nhapXuatXe(req, res) {
    try {
      const data = await baoCaoService.nhapXuatXe(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async nhapXuatPhuTung(req, res) {
    try {
      const data = await baoCaoService.nhapXuatPhuTung(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async theKhoPhuTung(req, res) {
    try {
      const data = await baoCaoService.theKhoPhuTung(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Transfer
  async chuyenKhoTongHop(req, res) {
    try {
      const data = await baoCaoService.chuyenKhoTongHop(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async chuyenKhoChiTiet(req, res) {
    try {
      const data = await baoCaoService.chuyenKhoChiTiet(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Debt
  async congNoNoiBo(req, res) {
    try {
      const data = await baoCaoService.congNoNoiBo(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async congNoKhachHang(req, res) {
    try {
      const result = await baoCaoService.congNoKhachHang(req.query);

      // Handle both old format (array) and new format (object with data and summary)
      if (Array.isArray(result)) {
        res.json({ success: true, data: result });
      } else {
        res.json({
          success: true,
          data: result.data,
          summary: result.summary,
        });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Income/Expense
  async thuChiTheoNgay(req, res) {
    try {
      const data = await baoCaoService.thuChiTheoNgay(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async thuChiTongHop(req, res) {
    try {
      const data = await baoCaoService.thuChiTongHop(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Customer
  async topKhachHang(req, res) {
    try {
      const data = await baoCaoService.topKhachHang(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async lichSuMuaHang(req, res) {
    try {
      const data = await baoCaoService.lichSuMuaHang(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Dashboard & Charts
  async dashboard(req, res) {
    try {
      const data = await baoCaoService.dashboard(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async bieuDoDoanhThu(req, res) {
    try {
      const data = await baoCaoService.bieuDoDoanhThu(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async bieuDoTonKho(req, res) {
    try {
      const data = await baoCaoService.bieuDoTonKho(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Export
  async xuatExcel(req, res) {
    try {
      const { loai_bao_cao, params } = req.body;
      let data = [];
      let columns = [];
      let filename = `bao-cao-${Date.now()}.xlsx`;

      switch (loai_bao_cao) {
        case "TON_KHO_XE":
          data = await baoCaoService.tonKhoXe(params);
          columns = [
            { header: "Mã Serial", key: "xe_key", width: 15 },
            { header: "Số Khung", key: "so_khung", width: 25 },
            { header: "Số Máy", key: "so_may", width: 20 },
            { header: "Loại Xe", key: "ten_loai", width: 25 },
            { header: "Màu", key: "ten_mau", width: 15 },
            { header: "Kho", key: "ten_kho", width: 20 },
            { header: "Giá Nhập", key: "gia_nhap", width: 15 },
            { header: "Ngày Nhập", key: "ngay_nhap", width: 15 },
          ];
          filename = "Bao_cao_ton_kho_xe.xlsx";
          break;

        case "TON_KHO_PHU_TUNG":
          data = await baoCaoService.tonKhoPhuTung(params);
          columns = [
            { header: "Mã PT", key: "ma_pt", width: 15 },
            { header: "Tên Phụ Tùng", key: "ten_pt", width: 30 },
            { header: "ĐVT", key: "don_vi_tinh", width: 10 },
            { header: "Nhóm", key: "nhom_pt", width: 15 },
            { header: "Tồn Kho", key: "so_luong_ton", width: 12 },
            { header: "Đang Khóa", key: "so_luong_khoa", width: 12 },
            { header: "Kho", key: "ten_kho", width: 20 },
          ];
          filename = "Bao_cao_ton_kho_phu_tung.xlsx";
          break;

        case "DOANH_THU_THANG":
          data = await baoCaoService.doanhThuTheoThang(params);
          columns = [
            { header: "Tháng", key: "thang", width: 10 },
            { header: "Số Hóa Đơn", key: "so_luong_hd", width: 15 },
            { header: "Doanh Thu", key: "doanh_thu", width: 20 },
            { header: "Thực Thu", key: "thuc_thu", width: 20 },
          ];
          filename = `Doanh_thu_nam_${params?.nam || "nay"}.xlsx`;
          break;

        case "CONG_NO_KH":
          data = await baoCaoService.congNoKhachHang(params);
          columns = [
            { header: "Mã KH", key: "ma_kh", width: 15 },
            { header: "Họ Tên", key: "ho_ten", width: 30 },
            { header: "Tổng Phải Trả", key: "tong_phai_tra", width: 20 },
            { header: "Đã Trả", key: "da_tra", width: 20 },
            { header: "Còn Lại", key: "con_lai", width: 20 },
          ];
          filename = "Bao_cao_cong_no_khach_hang.xlsx";
          break;

        case "THU_CHI":
          data = await baoCaoService.thuChiTheoNgay(params);
          columns = [
            { header: "Ngày", key: "ngay_giao_dich", width: 20 },
            { header: "Số Phiếu", key: "so_phieu", width: 15 },
            { header: "Loại", key: "loai", width: 10 },
            { header: "Số Tiền", key: "so_tien", width: 15 },
            { header: "Nội Dung", key: "dien_giai", width: 40 },
            { header: "Kho", key: "ten_kho", width: 20 },
          ];
          filename = "Bao_cao_thu_chi.xlsx";
          break;

        default:
          return res.status(400).json({
            success: false,
            message: `Loại báo cáo '${loai_bao_cao}' chưa được hỗ trợ xuất Excel`,
          });
      }

      const buffer = await generateExcel(data, columns, loai_bao_cao);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.end(buffer);
    } catch (error) {
      console.error("Export Excel Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async xuatPDF(req, res) {
    res.status(501).json({
      success: false,
      message:
        "Tính năng xuất PDF đang được phát triển (Cần cài đặt thêm thư viện hỗ trợ)",
    });
  }
}

module.exports = new BaoCaoController();
