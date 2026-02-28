const BulkImportService = require("../services/bulkImport.service");
const logger = require("../utils/logger");
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
      const tableName = "dm_doi_tac"; // NEW table

      let result;
      if (mode === "FAST") {
        // FAST mode yêu cầu CSV
        if (path.extname(req.file.originalname).toLowerCase() !== ".csv") {
          throw new Error("FAST import chỉ hỗ trợ file CSV");
        }
        const columns = [
          "ma_doi_tac", // ma_kh -> ma_doi_tac
          "ten_doi_tac", // ho_ten -> ten_doi_tac
          "dien_thoai",
          "dia_chi",
          "email",
        ];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns,
        );
      } else {
        // SAFE mode hỗ trợ Excel (mặc định)
        const mapping = [
          {
            dbCol: "ma_doi_tac", // ma_kh -> ma_doi_tac
            validator: (v) =>
              !v ? { error: "Mã KH không được để trống" } : {},
          },
          {
            dbCol: "ten_doi_tac", // ho_ten -> ten_doi_tac
            validator: (v) =>
              !v ? { error: "Họ tên không được để trống" } : {},
          },
          { dbCol: "dien_thoai" },
          { dbCol: "dia_chi" },
          { dbCol: "email" },
        ];
        // Inject loai_doi_tac = 'KHACH_HANG' for all rows
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping,
          { loai_doi_tac: "KHACH_HANG", status: true }, // Constant values
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
      const tableName = "tm_hang_hoa"; // NEW table

      let result;
      if (mode === "FAST") {
        throw new Error(
          "FAST mode hiện chưa hỗ trợ cấu trúc dữ liệu tùy chỉnh của Phụ tùng",
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_hang_hoa", // A: maPT
            validator: (v) =>
              !v ? { error: "Mã PT không được để trống" } : {},
          },
          {
            dbCol: "ten_hang_hoa", // B: tenTV
            validator: (v) =>
              !v ? { error: "Tên PT không được để trống" } : {},
          },
          { dbCol: "dummy_ten_ta" }, // C: tenTA
          { dbCol: "gia_von_mac_dinh" }, // D: giaBanCho
          { dbCol: "gia_ban_mac_dinh" }, // E: giaBanLeC
          { dbCol: "don_vi_tinh" }, // F: dvt
          { dbCol: "dummy_status" }, // G: trongBC
        ];

        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping,
          {
            loai_quan_ly: "BATCH",
            ma_nhom_hang: "PT",
            status: true,
          },
          (rowData) => {
            // Transform: Ghi chú lại tên tiếng Anh nếu có
            if (rowData.dummy_ten_ta) {
              rowData.mo_ta = `Tên TA: ${rowData.dummy_ten_ta}`;
            }
            // Áp dụng status từ cột G nếu là FALSE
            if (
              rowData.dummy_status === false ||
              rowData.dummy_status === "FALSE"
            ) {
              rowData.status = false;
            }

            delete rowData.dummy_ten_ta;
            delete rowData.dummy_status;
            return rowData;
          },
          { upsert: true, conflictCol: "ma_hang_hoa" },
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
      const tableName = "dm_noi_sx"; // sys_noi_sx -> dm_noi_sx
      let result;
      if (mode === "FAST") {
        const columns = ["ma", "ten"]; // ten_noi_sx -> ten
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns,
        );
      } else {
        const mapping = [
          {
            dbCol: "ma",
            validator: (v) => (!v ? { error: "Mã không được để trống" } : {}),
          },
          {
            dbCol: "ten", // ten_noi_sx -> ten
            validator: (v) => (!v ? { error: "Tên không được để trống" } : {}),
          },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping,
          { status: true },
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
      const tableName = "dm_nhom_hang"; // Brands now under dm_nhom_hang (XE subset)
      let result;
      if (mode === "FAST") {
        const columns = ["ma_nhom", "ten_nhom"]; // ma_nh -> ma_nhom, ten_nh -> ten_nhom
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns,
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_nhom",
            validator: (v) =>
              !v ? { error: "Mã NH không được để trống" } : {},
          },
          {
            dbCol: "ten_nhom",
            validator: (v) =>
              !v ? { error: "Tên NH không được để trống" } : {},
          },
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping,
          { ma_nhom_cha: "XE", status: true }, // Constant for Brands
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
      const tableName = "dm_mau"; // CRITICAL FIX: sys_mau -> dm_mau
      let result;
      if (mode === "FAST") {
        const columns = ["ma_mau", "ten_mau", "gia_tri"];
        result = await BulkImportService.fastImport(
          filePath,
          tableName,
          columns,
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
          mapping,
          { status: true },
          null,
          { upsert: true, conflictCol: "ma_mau" },
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
          columns,
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
          mapping,
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
      const tableName = "tm_hang_hoa"; // tm_xe_loai -> tm_hang_hoa
      let result;
      if (mode === "FAST") {
        throw new Error(
          "FAST mode hiện chưa hỗ trợ cấu trúc dữ liệu tùy chỉnh cho Model",
        );
      } else {
        const mapping = [
          {
            dbCol: "ma_hang_hoa", // A: maLoaiXe
            validator: (v) =>
              !v ? { error: "Mã loại không được để trống" } : {},
          },
          {
            dbCol: "ten_hang_hoa", // B: tenXe
            validator: (v) =>
              !v ? { error: "Tên loại không được để trống" } : {},
          },
          { dbCol: "dummy_doi_xe" }, // C: doiXe (skip)
          { dbCol: "dummy_ma_mau" }, // D: maMau (skip - Tránh lỗi numeric)
          { dbCol: "dummy_ma_khung" }, // E: maKhung (skip)
          { dbCol: "dummy_ma_may" }, // F: maMay (skip)
          { dbCol: "gia_von_mac_dinh" }, // G: giaNhap
        ];
        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping,
          {
            loai_quan_ly: "SERIAL",
            don_vi_tinh: "Chiếc",
            ma_nhom_hang: "XE", // Mặc định là nhóm Xe
            status: true,
          },
          (rowData) => {
            // Giá bán lẻ mặc định cao hơn giá nhập 10% nếu không có cột giá bán
            if (rowData.gia_von_mac_dinh && !rowData.gia_ban_mac_dinh) {
              rowData.gia_ban_mac_dinh =
                parseFloat(rowData.gia_von_mac_dinh) * 1.1;
            }
            // Dọn dẹp các trường tạm
            delete rowData.dummy_doi_xe;
            delete rowData.dummy_ma_mau;
            delete rowData.dummy_ma_khung;
            delete rowData.dummy_ma_may;
            return rowData;
          },
          { upsert: true, conflictCol: "ma_hang_hoa" },
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
      const { ma_kho = "KHO01" } = req.body; // Default warehouse if not provided
      if (!req.file) throw new Error("Vui lòng đính kèm file");
      const filePath = req.file.path;
      const tableName = "tm_hang_hoa_serial";
      let result;

      if (mode === "FAST") {
        throw new Error(
          "FAST mode hiện chưa hỗ trợ cấu trúc dữ liệu phức tạp của Xe",
        );
      } else {
        const mapping = [
          { dbCol: "ma_hang_hoa" }, // A: maLoaiXe
          { dbCol: "dummy_ten_xe" }, // B: tenXe (ignore)
          { dbCol: "dummy_doi_xe" }, // C: doiXe (ignore)
          { dbCol: "ma_mau" }, // D: maMau
          { dbCol: "serial_identifier" }, // E: maKhung (Số khung)
          { dbCol: "so_may" }, // F: maMay
          { dbCol: "gia_von" }, // G: giaNhap
        ];

        result = await BulkImportService.safeImport(
          filePath,
          tableName,
          mapping,
          {
            ma_kho_hien_tai: ma_kho,
            trang_thai: "TON_KHO",
            locked: false,
          },
          (rowData) => {
            // Transform: Chuyển Số Khung/Số Máy/Màu vào JSONB và tạo ma_serial
            rowData.ma_serial = rowData.serial_identifier; // Dùng số khung làm Key duy nhất
            rowData.thuoc_tinh_rieng = {
              so_khung: rowData.serial_identifier,
              so_may: rowData.so_may,
              mau_sac: { ma: rowData.ma_mau },
              doi_xe: rowData.dummy_doi_xe,
            };
            // Xóa các trường tạm không có trong DB
            delete rowData.dummy_ten_xe;
            delete rowData.dummy_doi_xe;
            delete rowData.ma_mau;
            delete rowData.so_may;
            return rowData;
          },
          { upsert: true, conflictCol: "ma_serial" },
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
          columns,
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
          mapping,
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
          columns,
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
          mapping,
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
          columns,
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
          mapping,
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
          columns,
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
          mapping,
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
          columns,
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
          mapping,
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
