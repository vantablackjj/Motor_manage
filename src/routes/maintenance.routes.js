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
 * @route   POST /api/maintenance/:id/approve
 * @desc    Phê duyệt phiếu bảo trì (cập nhật trạng thái DA_DUYET và trừ kho phụ tùng)
 * @access  Private (inventory.approve)
 */
router.post(
  "/:id/approve",
  checkPermission("inventory", "approve"),
  MaintenanceController.approve,
);

/**
 * @route   POST /api/maintenance/:id/reject
 * @desc    Từ chối/Hủy phiếu bảo trì (cập nhật trạng thái DA_HUY)
 * @access  Private (inventory.approve)
 */
router.post(
  "/:id/reject",
  checkPermission("inventory", "approve"),
  MaintenanceController.reject,
);

module.exports = router;
