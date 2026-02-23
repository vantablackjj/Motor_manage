const baoCaoService = require("../services/baoCao.service");
const { generateExcel } = require("../ultils/excelHelper");
const pdfGenerator = require("../ultils/pdfGenerator");

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
          const resKH = await baoCaoService.congNoKhachHang(params);
          data = Array.isArray(resKH) ? resKH : resKH.data || [];
          columns = [
            { header: "Mã ĐT", key: "ma_doi_tac", width: 15 },
            { header: "Họ Tên", key: "ho_ten", width: 30 },
            { header: "Loại DT", key: "loai_doi_tac", width: 15 },
            { header: "Loại Nợ", key: "loai_cong_no", width: 15 },
            { header: "Tổng Nợ", key: "tong_phai_tra", width: 20 },
            { header: "Đã Trả", key: "da_tra", width: 20 },
            { header: "Còn Lại", key: "con_lai", width: 20 },
            { header: "Cập Nhật", key: "ngay_cap_nhat", width: 20 },
          ];
          filename = "Bao_cao_cong_no_doi_tac.xlsx";
          break;

        case "CONG_NO_NOI_BO":
          data = await baoCaoService.congNoNoiBo(params);
          columns = [
            { header: "Kho Nợ", key: "kho_no", width: 20 },
            { header: "Kho Có", key: "kho_co", width: 20 },
            { header: "Tổng Nợ", key: "tong_no", width: 20 },
            { header: "Đã Trả", key: "da_tra", width: 20 },
            { header: "Còn Lại", key: "con_lai", width: 20 },
            { header: "Cập Nhật", key: "updated_at", width: 20 },
          ];
          filename = "Bao_cao_cong_no_noi_bo.xlsx";
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
          filename = "Bao_cao_thu_chi_chi_tiet.xlsx";
          break;

        case "THU_CHI_TONG_HOP":
          data = await baoCaoService.thuChiTongHop(params);
          columns = [
            { header: "Kho", key: "ten_kho", width: 25 },
            { header: "Tổng Thu", key: "tong_thu", width: 20 },
            { header: "Tổng Chi", key: "tong_chi", width: 20 },
            { header: "Chênh Lệch", key: "chenh_lech", width: 20 },
          ];
          // Tính chênh lệch cho Excel
          data = data.map((item) => ({
            ...item,
            chenh_lech:
              (parseFloat(item.tong_thu) || 0) -
              (parseFloat(item.tong_chi) || 0),
          }));
          filename = "Bao_cao_thu_chi_tong_hop.xlsx";
          break;

        case "CHI_TIET_MUA_HANG":
          data = await baoCaoService.chiTietMuaHang(params);
          columns = [
            { header: "Ngày HĐ", key: "ngay_hoa_don", width: 15 },
            { header: "Số HĐ", key: "so_hoa_don", width: 15 },
            { header: "Nhà Cung Cấp", key: "ten_ncc", width: 30 },
            { header: "Sản Phẩm", key: "ten_hang_hoa", width: 30 },
            { header: "Số Khung", key: "so_khung", width: 20 },
            { header: "Số Máy", key: "so_may", width: 20 },
            { header: "Số Lượng", key: "so_luong", width: 10 },
            { header: "Đơn Giá", key: "don_gia", width: 15 },
            { header: "Thành Tiền", key: "thanh_tien", width: 20 },
          ];
          filename = "So_chi_tiet_mua_hang.xlsx";
          break;

        case "NHAP_XUAT_XE":
          data = await baoCaoService.nhapXuatXe(params);
          columns = [
            { header: "Ngày", key: "ngay_giao_dich", width: 20 },
            { header: "Số Chứng Từ", key: "so_chung_tu", width: 20 },
            { header: "Tên Loại", key: "ten_loai", width: 25 },
            { header: "Số Khung", key: "so_khung", width: 25 },
            { header: "Màu", key: "ten_mau", width: 15 },
            { header: "Loại GD", key: "loai_giao_dich", width: 15 },
            { header: "Kho Xuất", key: "kho_xuat", width: 20 },
            { header: "Kho Nhập", key: "kho_nhap", width: 20 },
            { header: "Người Thực Hiện", key: "nguoi_thuc_hien", width: 20 },
          ];
          filename = "Bao_cao_nhap_xuat_xe.xlsx";
          break;

        case "NHAP_XUAT_PHU_TUNG":
          data = await baoCaoService.nhapXuatPhuTung(params);
          columns = [
            { header: "Ngày", key: "ngay_giao_dich", width: 20 },
            { header: "Số Chứng Từ", key: "so_chung_tu", width: 20 },
            { header: "Tên Phụ Tùng", key: "ten_pt", width: 30 },
            { header: "ĐVT", key: "don_vi_tinh", width: 10 },
            { header: "Số Lượng", key: "so_luong", width: 12 },
            { header: "Loại GD", key: "loai_giao_dich", width: 15 },
            { header: "Kho Xuất", key: "kho_xuat", width: 20 },
            { header: "Kho Nhập", key: "kho_nhap", width: 20 },
            { header: "Người Thực Hiện", key: "nguoi_thuc_hien", width: 20 },
          ];
          filename = "Bao_cao_nhap_xuat_phu_tung.xlsx";
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

  // Purchase Details
  async chiTietMuaHang(req, res) {
    try {
      const data = await baoCaoService.chiTietMuaHang(req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async xuatPDF(req, res) {
    try {
      const { loai_bao_cao, params } = req.body;
      let buffer;
      let filename = `bao-cao-${Date.now()}.pdf`;

      // Special handling for legacy PDF reports
      if (loai_bao_cao === "CHI_TIET_MUA_HANG_LEGACY") {
        const data = await baoCaoService.chiTietMuaHang(params);
        buffer = await pdfGenerator.generatePurchaseReport(data, params);
        filename = "So_chi_tiet_mua_hang.pdf";
      } else {
        let data = [];
        let columns = [];
        let title = "BÁO CÁO";

        switch (loai_bao_cao) {
          case "TON_KHO_XE":
            data = await baoCaoService.tonKhoXe(params);
            columns = [
              { header: "Số Khung", key: "so_khung", width: 25 },
              { header: "Số Máy", key: "so_may", width: 20 },
              { header: "Loại Xe", key: "ten_loai", width: 25 },
              { header: "Màu", key: "ten_mau", width: 15 },
              { header: "Kho", key: "ten_kho", width: 20 },
              { header: "Giá Nhập", key: "gia_nhap", width: 15 },
            ];
            title = "BÁO CÁO TỒN KHO XE";
            filename = "Bao_cao_ton_kho_xe.pdf";
            break;

          case "TON_KHO_PHU_TUNG":
            data = await baoCaoService.tonKhoPhuTung(params);
            columns = [
              { header: "Mã PT", key: "ma_pt", width: 15 },
              { header: "Tên Phụ Tùng", key: "ten_pt", width: 30 },
              { header: "ĐVT", key: "don_vi_tinh", width: 10 },
              { header: "Tồn Kho", key: "so_luong_ton", width: 12 },
              { header: "Kho", key: "ten_kho", width: 20 },
            ];
            title = "BÁO CÁO TỒN KHO PHỤ TÙNG";
            filename = "Bao_cao_ton_kho_phu_tung.pdf";
            break;

          case "DOANH_THU_THANG":
            data = await baoCaoService.doanhThuTheoThang(params);
            columns = [
              { header: "Tháng", key: "thang", width: 10 },
              { header: "Số Hóa Đơn", key: "so_luong_hd", width: 15 },
              { header: "Doanh Thu", key: "doanh_thu", width: 20 },
              { header: "Thực Thu", key: "thuc_thu", width: 20 },
            ];
            title = `BÁO CÁO DOANH THU NĂM ${params?.nam || ""}`;
            filename = "Bao_cao_doanh_thu.pdf";
            break;

          case "CONG_NO_KH":
            const resKH = await baoCaoService.congNoKhachHang(params);
            data = Array.isArray(resKH) ? resKH : resKH.data || [];
            columns = [
              { header: "Mã KH", key: "ma_doi_tac", width: 15 },
              { header: "Họ Tên", key: "ho_ten", width: 30 },
              { header: "Tổng Nợ", key: "tong_phai_tra", width: 20 },
              { header: "Đã Trả", key: "da_tra", width: 20 },
              { header: "Còn Lại", key: "con_lai", width: 20 },
            ];
            title = "BÁO CÁO CÔNG NỢ ĐỐI TÁC";
            filename = "Bao_cao_cong_no.pdf";
            break;

          case "CONG_NO_NOI_BO":
            data = await baoCaoService.congNoNoiBo(params);
            columns = [
              { header: "Kho Nợ", key: "kho_no", width: 20 },
              { header: "Kho Có", key: "kho_co", width: 20 },
              { header: "Tổng Nợ", key: "tong_no", width: 20 },
              { header: "Còn Lại", key: "con_lai", width: 20 },
            ];
            title = "BÁO CÁO CÔNG NỢ NỘI BỘ";
            filename = "Bao_cao_cong_no_noi_bo.pdf";
            break;

          case "THU_CHI":
            data = await baoCaoService.thuChiTheoNgay(params);
            columns = [
              { header: "Ngày", key: "ngay_giao_dich", width: 20 },
              { header: "Loại", key: "loai", width: 10 },
              { header: "Số Tiền", key: "so_tien", width: 15 },
              { header: "Nội Dung", key: "dien_giai", width: 40 },
              { header: "Kho", key: "ten_kho", width: 20 },
            ];
            title = "BÁO CÁO THU CHI CHI TIẾT";
            filename = "Bao_cao_thu_chi.pdf";
            break;

          case "THU_CHI_TONG_HOP":
            data = await baoCaoService.thuChiTongHop(params);
            columns = [
              { header: "Kho", key: "ten_kho", width: 25 },
              { header: "Tổng Thu", key: "tong_thu", width: 20 },
              { header: "Tổng Chi", key: "tong_chi", width: 20 },
            ];
            title = "BÁO CÁO TỔNG HỢP THU CHI";
            filename = "Bao_cao_thu_chi_tong_hop.pdf";
            break;

          case "CHI_TIET_MUA_HANG":
            data = await baoCaoService.chiTietMuaHang(params);
            columns = [
              { header: "Ngày HĐ", key: "ngay_hoa_don", width: 15 },
              { header: "Số HĐ", key: "so_hoa_don", width: 15 },
              { header: "NCC", key: "ten_ncc", width: 30 },
              { header: "Sản phẩm", key: "ten_hang_hoa", width: 30 },
              { header: "SL", key: "so_luong", width: 12 },
              { header: "Thành tiền", key: "thanh_tien", width: 20 },
            ];
            title = "SỔ CHI TIẾT MUA HÀNG";
            filename = "So_chi_tiet_mua_hang.pdf";
            break;

          case "NHAP_XUAT_XE":
            data = await baoCaoService.nhapXuatXe(params);
            columns = [
              { header: "Ngày", key: "ngay_giao_dich", width: 20 },
              { header: "Số Chứng Từ", key: "so_chung_tu", width: 20 },
              { header: "Tên Loại", key: "ten_loai", width: 25 },
              { header: "Số Khung", key: "so_khung", width: 25 },
              { header: "Màu", key: "ten_mau", width: 15 },
              { header: "Kho Xuất", key: "kho_xuat", width: 20 },
              { header: "Kho Nhập", key: "kho_nhap", width: 20 },
            ];
            title = "BÁO CÁO NHẬP XUẤT XE";
            filename = "Bao_cao_nhap_xuat_xe.pdf";
            break;

          case "NHAP_XUAT_PHU_TUNG":
            data = await baoCaoService.nhapXuatPhuTung(params);
            columns = [
              { header: "Ngày", key: "ngay_giao_dich", width: 20 },
              { header: "Số Chứng Từ", key: "so_chung_tu", width: 20 },
              { header: "Tên Phụ Tùng", key: "ten_pt", width: 30 },
              { header: "ĐVT", key: "don_vi_tinh", width: 10 },
              { header: "Số Lượng", key: "so_luong", width: 12 },
              { header: "Kho Xuất", key: "kho_xuat", width: 20 },
              { header: "Kho Nhập", key: "kho_nhap", width: 20 },
            ];
            title = "BÁO CÁO NHẬP XUẤT PHỤ TÙNG";
            filename = "Bao_cao_nhap_xuat_phu_tung.pdf";
            break;

          default:
            return res.status(400).json({
              success: false,
              message: `Loại báo cáo '${loai_bao_cao}' chưa được hỗ trợ xuất PDF`,
            });
        }

        buffer = await pdfGenerator.generateGenericPdf(
          data,
          columns,
          title,
          params,
        );
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.end(buffer);
    } catch (error) {
      console.error("Export PDF Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new BaoCaoController();
