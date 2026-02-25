const express = require("express");
const router = express.Router();
const PushController = require("../controllers/push.controller");
const { authenticate } = require("../middleware/auth");

/**
 * @route   GET /api/push/vapid-public-key
 * @desc    Lấy VAPID public key để FE khởi tạo push subscription
 * @access  Public (không cần đăng nhập vì FE cần key trước khi user login)
 */
router.get("/vapid-public-key", PushController.getVapidPublicKey);

// Các route bên dưới yêu cầu đăng nhập
router.use(authenticate);

/**
 * @route   POST /api/push/subscribe
 * @desc    Lưu subscription của browser vào DB
 * @access  Private
 * @body    { subscription: { endpoint, keys: { p256dh, auth } } }
 */
router.post("/subscribe", PushController.subscribe);

/**
 * @route   POST /api/push/unsubscribe
 * @desc    Xóa subscription (user tắt notification)
 * @access  Private
 * @body    { endpoint: string }
 */
router.post("/unsubscribe", PushController.unsubscribe);

/**
 * @route   POST /api/push/test
 * @desc    Gửi push notification thử nghiệm đến user hiện tại
 * @access  Private (dùng khi dev/test)
 */
router.post("/test", PushController.sendTest);

module.exports = router;
