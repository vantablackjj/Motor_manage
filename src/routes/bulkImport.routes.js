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
    if (ext !== ".xlsx" && ext !== ".xls") {
      return cb(new Error("Chỉ chấp nhận file Excel (.xlsx, .xls)"));
    }
    cb(null, true);
  },
});

/**
 * @route   POST /api/import/khach-hang
 * @desc    Import khách hàng từ Excel
 * @access  Private (ADMIN)
 */
router.post(
  "/khach-hang",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importKhachHang
);

/**
 * @route   POST /api/import/phu-tung
 * @desc    Import phụ tùng từ Excel
 * @access  Private (ADMIN)
 */
router.post(
  "/phu-tung",
  authenticate,
  authorize(["ADMIN"]),
  upload.single("file"),
  BulkImportController.importPhuTung
);

module.exports = router;
