const express = require("express");
const router = express.Router();
const MaintenanceController = require("../controllers/MaintenanceController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const {
  createMaintenanceSchema,
} = require("../validations/maintenance.validation");
const { checkPermission, checkAnyPermission } = require("../middleware/roleCheck");

const { warehouseIsolation } = require("../middleware/warehouseIsolation");

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Quản lý bảo trì xe
 */

router.use(authenticate, warehouseIsolation);

router.post(
  "/",
  checkPermission("maintenance", "edit"),
  validate(createMaintenanceSchema),
  MaintenanceController.create,
);

router.get(
  "/",
  checkPermission("maintenance", "view"),
  MaintenanceController.getAll,
);

router.get(
  "/reminders",
  checkPermission("maintenance", "view"),
  MaintenanceController.getReminders,
);

router.patch(
  "/reminders/:id",
  checkPermission("maintenance", "edit"),
  MaintenanceController.updateReminderStatus,
);

router.post(
  "/trigger-reminders",
  checkPermission("admin", "full"),
  MaintenanceController.triggerReminders,
);

/**
 * @route   GET /api/maintenance/ban-nang/list
 * @desc    Lấy danh sách bàn nâng và trạng thái
 * @access  Private (inventory.view)
 */
router.get(
  "/ban-nang/list",
  checkPermission("maintenance", "view"),
  MaintenanceController.getBanNang,
);

router.post(
  "/ban-nang",
  checkPermission("maintenance", "edit"),
  MaintenanceController.addBanNang,
);

router.put(
  "/ban-nang/:id",
  checkPermission("maintenance", "edit"),
  MaintenanceController.updateBanNang,
);

router.delete(
  "/ban-nang/:id",
  checkPermission("maintenance", "edit"),
  MaintenanceController.deleteBanNang,
);

router.get(
  "/technicians/list",
  checkPermission("maintenance", "view"),
  MaintenanceController.getTechnicians,
);

router.get(
  "/:id",
  checkPermission("maintenance", "view"),
  MaintenanceController.getById,
);

/**
 * @route   PUT /api/maintenance/:id/status
 * @desc    Cập nhật trạng thái phiếu (Tạo hđ mới, Xuất kho nếu hoàn thành, vv)
 * @access  Private (inventory.edit)
 */
router.put(
  "/:id/status",
  checkPermission("maintenance", "edit"),
  MaintenanceController.updateStatus,
);

module.exports = router;
