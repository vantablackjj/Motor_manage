const express = require("express");
const router = express.Router();
const BulkExportController = require("../controllers/bulkExport.controller");
const { authenticate, authorize } = require("../middleware/auth");

// Tất cả các route export đều yêu cầu đăng nhập và quyền ADMIN
router.use(authenticate);
router.use(authorize(["ADMIN"]));

// --- MASTER DATA ---
router.get("/brand", BulkExportController.exportBrands);
router.get("/color", BulkExportController.exportColors);
router.get("/warehouse", BulkExportController.exportWarehouses);
router.get("/origin", BulkExportController.exportOrigins);
router.get("/vehicle-type", BulkExportController.exportVehicleTypes);
router.get("/customer", BulkExportController.exportCustomers);
router.get("/part", BulkExportController.exportParts);

// --- TRANSACTIONS ---
router.get("/thu-chi", BulkExportController.exportThuChi);
router.get("/nhap-kho", BulkExportController.exportNhapKho);
router.get("/xuat-kho", BulkExportController.exportXuatKho);
router.get("/transfer-xe", BulkExportController.exportTransferXe);
router.get("/transfer-pt", BulkExportController.exportTransferPT);

module.exports = router;
