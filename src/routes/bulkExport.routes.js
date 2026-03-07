const express = require("express");
const router = express.Router();
const BulkExportController = require("../controllers/bulkExport.controller");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");

// Tất cả các route export đều yêu cầu đăng nhập
router.use(authenticate);

// Middleware kiểm tra quyền export chung cho cả module
const checkExportPermission = checkPermission("reports", "export");

router.use(checkExportPermission);

// --- MASTER DATA ---
router.get("/brand", BulkExportController.exportBrands);
router.get("/color", BulkExportController.exportColors);
router.get("/warehouse", BulkExportController.exportWarehouses);
router.get("/origin", BulkExportController.exportOrigins);
router.get("/vehicle-type", BulkExportController.exportVehicleTypes);
router.get("/customer", BulkExportController.exportCustomers);
router.get("/part", BulkExportController.exportParts);
router.get("/xe-ton-kho", BulkExportController.exportXeTonKho);

// --- TRANSACTIONS ---
router.get("/thu-chi", BulkExportController.exportThuChi);
router.get("/nhap-kho", BulkExportController.exportNhapKho);
router.get("/nhap-kho-xe", BulkExportController.exportNhapKhoXe);
router.get("/xuat-kho", BulkExportController.exportXuatKho);
router.get("/xuat-kho-xe", BulkExportController.exportXuatKhoXe);
router.get("/transfer-xe", BulkExportController.exportTransferXe);
router.get("/transfer-pt", BulkExportController.exportTransferPT);

module.exports = router;
