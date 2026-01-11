const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const BulkImportController = require("../controllers/bulkImport.controller");
const { authenticate, authorize } = require("../middleware/auth");

// Đảm bảo thư mục uploads tồn tại
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".xlsx" && ext !== ".xls" && ext !== ".csv") {
      return cb(
        new Error("Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV (.csv)")
      );
    }
    cb(null, true);
  },
});

/**
 * @route   POST /api/import/customer
 * @desc    Import khách hàng
 */
router.post(
  "/customer",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importKhachHang
);

/**
 * @route   POST /api/import/part
 * @desc    Import phụ tùng
 */
router.post(
  "/part",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importPhuTung
);

/**
 * @route   POST /api/import/origin
 * @desc    Import nơi sản xuất
 */
router.post(
  "/origin",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importNoiSx
);

/**
 * @route   POST /api/import/brand
 * @desc    Import nhãn hiệu
 */
router.post(
  "/brand",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importBrand
);

/**
 * @route   POST /api/import/color
 * @desc    Import màu sắc
 */
router.post(
  "/color",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importColor
);

/**
 * @route   POST /api/import/warehouse
 * @desc    Import kho
 */
router.post(
  "/warehouse",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importWarehouse
);

/**
 * @route   POST /api/import/vehicle-type
 * @desc    Import loại xe
 */
router.post(
  "/vehicle-type",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importVehicleType
);

/**
 * @route   POST /api/import/xe
 * @desc    Import xe thực tế
 */
router.post(
  "/xe",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importXe
);

/**
 * @route   POST /api/import/thu-chi
 * @desc    Import thu chi
 */
router.post(
  "/thu-chi",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importThuChi
);

/**
 * @route   POST /api/import/nhap-kho
 * @desc    Import nhập kho
 */
router.post(
  "/nhap-kho",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importNhapKho
);

/**
 * @route   POST /api/import/xuat-kho
 * @desc    Import xuất kho
 */
router.post(
  "/xuat-kho",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importXuatKho
);

/**
 * @route   POST /api/import/transfer-xe
 * @desc    Import chuyển kho xe
 */
router.post(
  "/transfer-xe",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importTransferXe
);

/**
 * @route   POST /api/import/transfer-pt
 * @desc    Import chuyển kho phụ tùng
 */
router.post(
  "/transfer-pt",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importTransferPT
);

module.exports = router;
