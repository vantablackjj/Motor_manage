const BulkImportService = require("../services/bulkImport.service");
const logger = require("../ultils/logger");
const fs = require("fs");
const path = require("path");

class BulkImportController {
  /**
   * Import khách hàng
   */
  static async importKhachHang(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "Vui lòng đính kèm file" });
      }

      const filePath = req.file.path;
      const tableName = "tm_khach_hang";

      let result;
      if (mode === "FAST") {
        // FAST mode yêu cầu CSV
        if (path.extname(req.file.originalname).toLowerCase() !== ".csv") {
          throw new Error("FAST import chỉ hỗ trợ file CSV");
        }
        const columns = [
          "ma_kh",
          "ho_ten",
          "dien_thoai",
          "dia_chi",
          "email",
          "la_ncc",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        // SAFE mode hỗ trợ Excel (mặc định)
        const mapping = [
          {
            dbCol: "ma_kh",
            validator: (v) =>
              !v ? { error: "Mã KH không được để trống" } : {},
          },
          {
            dbCol: "ho_ten",
            validator: (v) =>
              !v ? { error: "Họ tên không được để trống" } : {},
          },
          { dbCol: "dien_thoai" },
          { dbCol: "dia_chi" },
          { dbCol: "email" },
          {
            dbCol: "la_ncc",
            validator: (v) =>
              v === undefined ? { error: "la_ncc phải có giá trị" } : {},
          },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }

      await fs.unlinkSync(filePath);
      res.status(200).json({
        success: true,
        message: `Import ${mode} hoàn tất`,
        ...result,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      logger.error("Error in importKhachHang", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import phụ tùng
   */
  static async importPhuTung(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "Vui lòng đính kèm file" });
      }

      const filePath = req.file.path;
      const tableName = "tm_phu_tung";

      let result;
      if (mode === "FAST") {
        if (path.extname(req.file.originalname).toLowerCase() !== ".csv") {
          throw new Error("FAST import chỉ hỗ trợ file CSV");
        }
        const columns = [
          "ma_pt",
          "ten_pt",
          "don_vi_tinh",
          "gia_nhap",
          "gia_ban",
          "vat",
          "nhom_pt",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_pt",
            validator: (v) =>
              !v ? { error: "Mã PT không được để trống" } : {},
          },
          {
            dbCol: "ten_pt",
            validator: (v) =>
              !v ? { error: "Tên PT không được để trống" } : {},
          },
          { dbCol: "don_vi_tinh" },
          { dbCol: "gia_nhap" },
          { dbCol: "gia_ban" },
          { dbCol: "vat" },
          { dbCol: "nhom_pt" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }

      fs.unlinkSync(filePath);
      res.status(200).json({
        success: true,
        message: `Import ${mode} hoàn tất`,
        ...result,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      logger.error("Error in importPhuTung", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Nơi sản xuất
   */
  static async importNoiSx(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "sys_noi_sx";
      let result;
      if (mode === "FAST") {
        const columns = ["ma", "ten_noi_sx"];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma",
            validator: (v) => (!v ? { error: "Mã không được để trống" } : {}),
          },
          {
            dbCol: "ten_noi_sx",
            validator: (v) => (!v ? { error: "Tên không được để trống" } : {}),
          },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Nhãn hiệu
   */
  static async importBrand(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "sys_nhan_hieu";
      let result;
      if (mode === "FAST") {
        const columns = ["ma_nh", "ten_nh"];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_nh",
            validator: (v) =>
              !v ? { error: "Mã NH không được để trống" } : {},
          },
          {
            dbCol: "ten_nh",
            validator: (v) =>
              !v ? { error: "Tên NH không được để trống" } : {},
          },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Màu sắc
   */
  static async importColor(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "sys_mau";
      let result;
      if (mode === "FAST") {
        const columns = ["ma_mau", "ten_mau", "gia_tri"];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_mau",
            validator: (v) =>
              !v ? { error: "Mã màu không được để trống" } : {},
          },
          {
            dbCol: "ten_mau",
            validator: (v) =>
              !v ? { error: "Tên màu không được để trống" } : {},
          },
          { dbCol: "gia_tri" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Kho
   */
  static async importWarehouse(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "sys_kho";
      let result;
      if (mode === "FAST") {
        const columns = [
          "ma_kho",
          "ten_kho",
          "dia_chi",
          "dien_thoai",
          "chinh",
          "daily",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_kho",
            validator: (v) =>
              !v ? { error: "Mã kho không được để trống" } : {},
          },
          {
            dbCol: "ten_kho",
            validator: (v) =>
              !v ? { error: "Tên kho không được để trống" } : {},
          },
          { dbCol: "dia_chi" },
          { dbCol: "dien_thoai" },
          { dbCol: "chinh" },
          { dbCol: "daily" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Loại xe (Vehicle Type)
   */
  static async importVehicleType(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "tm_xe_loai";
      let result;
      if (mode === "FAST") {
        const columns = [
          "ma_loai",
          "ten_loai",
          "ma_nh",
          "noi_sx",
          "loai_hinh",
          "gia_nhap",
          "gia_ban",
          "vat",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_loai",
            validator: (v) =>
              !v ? { error: "Mã loại không được để trống" } : {},
          },
          {
            dbCol: "ten_loai",
            validator: (v) =>
              !v ? { error: "Tên loại không được để trống" } : {},
          },
          { dbCol: "ma_nh" },
          { dbCol: "noi_sx" },
          { dbCol: "loai_hinh" },
          { dbCol: "gia_nhap" },
          { dbCol: "gia_ban" },
          { dbCol: "vat" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Xe thực tế
   */
  static async importXe(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "tm_xe_thuc_te";
      let result;
      if (mode === "FAST") {
        const columns = [
          "xe_key",
          "so_khung",
          "so_may",
          "ma_loai_xe",
          "ma_mau",
          "ma_kho_hien_tai",
          "gia_nhap",
          "trang_thai",
          "ngay_nhap",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "xe_key",
            validator: (v) =>
              !v ? { error: "Xe Key không được để trống" } : {},
          },
          {
            dbCol: "so_khung",
            validator: (v) =>
              !v ? { error: "Số khung không được để trống" } : {},
          },
          {
            dbCol: "so_may",
            validator: (v) =>
              !v ? { error: "Số máy không được để trống" } : {},
          },
          { dbCol: "ma_loai_xe" },
          { dbCol: "ma_mau" },
          { dbCol: "ma_kho_hien_tai" },
          { dbCol: "gia_nhap" },
          { dbCol: "trang_thai" },
          { dbCol: "ngay_nhap" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Thu Chi
   */
  static async importThuChi(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "tm_thu_chi";
      let result;
      if (mode === "FAST") {
        const columns = [
          "so_phieu",
          "loai",
          "so_tien",
          "ngay_giao_dich",
          "ma_kho",
          "ma_kh",
          "dien_giai",
          "trang_thai",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "so_phieu",
            validator: (v) =>
              !v ? { error: "Số phiếu không được để trống" } : {},
          },
          { dbCol: "loai" },
          { dbCol: "so_tien" },
          { dbCol: "ngay_giao_dich" },
          { dbCol: "ma_kho" },
          { dbCol: "ma_kh" },
          { dbCol: "dien_giai" },
          { dbCol: "trang_thai" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Nhập kho (Chi tiết đơn hàng mua)
   */
  static async importNhapKho(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "tm_don_hang_mua_ct";
      let result;
      if (mode === "FAST") {
        const columns = [
          "ma_phieu",
          "stt",
          "ma_pt",
          "ten_pt",
          "don_vi_tinh",
          "so_luong",
          "don_gia",
          "thanh_tien",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_phieu",
            validator: (v) =>
              !v ? { error: "Mã phiếu không được để trống" } : {},
          },
          { dbCol: "stt" },
          { dbCol: "ma_pt" },
          { dbCol: "ten_pt" },
          { dbCol: "don_vi_tinh" },
          { dbCol: "so_luong" },
          { dbCol: "don_gia" },
          { dbCol: "thanh_tien" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Xuất kho (Chi tiết hóa đơn bán)
   */
  static async importXuatKho(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "tm_hoa_don_ban_ct";
      let result;
      if (mode === "FAST") {
        const columns = [
          "ma_hd",
          "stt",
          "loai_hang",
          "ma_pt",
          "xe_key",
          "so_luong",
          "don_gia",
          "thanh_tien",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_hd",
            validator: (v) =>
              !v ? { error: "Mã HD không được để trống" } : {},
          },
          { dbCol: "stt" },
          { dbCol: "loai_hang" },
          { dbCol: "ma_pt" },
          { dbCol: "xe_key" },
          { dbCol: "so_luong" },
          { dbCol: "don_gia" },
          { dbCol: "thanh_tien" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Chuyển kho Xe
   */
  static async importTransferXe(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "tm_chuyen_kho_xe";
      let result;
      if (mode === "FAST") {
        const columns = [
          "ma_phieu",
          "stt",
          "xe_key",
          "ma_loai_xe",
          "ma_mau",
          "so_may",
          "gia_tri_chuyen_kho",
          "trang_thai",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_phieu",
            validator: (v) =>
              !v ? { error: "Mã phiếu không được để trống" } : {},
          },
          { dbCol: "stt" },
          { dbCol: "xe_key" },
          { dbCol: "ma_loai_xe" },
          { dbCol: "ma_mau" },
          { dbCol: "so_may" },
          { dbCol: "gia_tri_chuyen_kho" },
          { dbCol: "trang_thai" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Import Chuyển kho Phụ tùng
   */
  static async importTransferPT(req, res, next) {
    try {
      const { mode = "SAFE" } = req.body;
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "tm_chuyen_kho_phu_tung";
      let result;
      if (mode === "FAST") {
        const columns = [
          "ma_phieu",
          "stt",
          "ma_pt",
          "ten_pt",
          "don_vi_tinh",
          "so_luong",
          "don_gia",
          "thanh_tien",
          "trang_thai",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_phieu",
            validator: (v) =>
              !v ? { error: "Mã phiếu không được để trống" } : {},
          },
          { dbCol: "stt" },
          { dbCol: "ma_pt" },
          { dbCol: "ten_pt" },
          { dbCol: "don_vi_tinh" },
          { dbCol: "so_luong" },
          { dbCol: "don_gia" },
          { dbCol: "thanh_tien" },
          { dbCol: "trang_thai" },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping
        );
      }
      fs.unlinkSync(filePath);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = BulkImportController;
