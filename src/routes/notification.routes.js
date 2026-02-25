const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", NotificationController.getNotifications);
router.patch("/read-all", NotificationController.markAllAsRead);
router.patch("/:id/read", NotificationController.markAsRead);
router.delete("/:id", NotificationController.deleteNotification);

module.exports = router;
