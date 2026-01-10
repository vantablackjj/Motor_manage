const baoCaoService = require("../services/baoCao.service");

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
      const data = await baoCaoService.congNoKhachHang(req.query);
      res.json({ success: true, data });
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
    res
      .status(501)
      .json({ success: false, message: "Chưa triển khai xuất Excel" });
  }

  async xuatPDF(req, res) {
    res
      .status(501)
      .json({ success: false, message: "Chưa triển khai xuất PDF" });
  }
}

module.exports = new BaoCaoController();
