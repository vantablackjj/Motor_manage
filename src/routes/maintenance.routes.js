const express = require("express");
const router = express.Router();
const MaintenanceController = require("../controllers/MaintenanceController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const maintenanceValidation = require("../validations/maintenance.validation");
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
  validate(maintenanceValidation.create),
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

module.exports = router;
