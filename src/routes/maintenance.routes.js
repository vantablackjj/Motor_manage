const express = require("express");
const router = express.Router();
const MaintenanceController = require("../controllers/MaintenanceController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const {
  createMaintenanceSchema,
} = require("../validations/maintenance.validation");
const { checkPermission } = require("../middleware/permissions");

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Quản lý bảo trì xe
 */

router.use(authenticate);

router.post(
  "/",
  checkPermission("inventory", "edit"),
  validate(createMaintenanceSchema),
  MaintenanceController.create,
);

router.get(
  "/",
  checkPermission("inventory", "view"),
  MaintenanceController.getAll,
);

router.get(
  "/:id",
  checkPermission("inventory", "view"),
  MaintenanceController.getById,
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
  checkPermission("inventory", "view"),
  MaintenanceController.getBanNang,
);

/**
 * @route   PUT /api/maintenance/:id/status
 * @desc    Cập nhật trạng thái phiếu (Tạo hđ mới, Xuất kho nếu hoàn thành, vv)
 * @access  Private (inventory.edit)
 */
router.put(
  "/:id/status",
  checkPermission("inventory", "edit"),
  MaintenanceController.updateStatus,
);

module.exports = router;
