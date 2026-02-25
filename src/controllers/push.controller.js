const PushNotificationService = require("../services/pushNotification.service");
const { sendSuccess, sendError } = require("../utils/response");

class PushController {
  /**
   * GET /api/push/vapid-public-key
   * Trả về VAPID public key để FE gọi trước khi subscribe.
   * Public route — không cần xác thực.
   */
  static getVapidPublicKey(req, res) {
    const key = PushNotificationService.getPublicKey();
    if (!key) {
      return sendError(
        res,
        "Push notifications chưa được cấu hình trên server",
        503,
      );
    }
    sendSuccess(res, { publicKey: key }, "VAPID public key");
  }

  /**
   * POST /api/push/subscribe
   * Browser gọi sau khi user đồng ý nhận thông báo.
   * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
   */
  static async subscribe(req, res, next) {
    try {
      const user_id = req.user.id;
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return sendError(res, "Dữ liệu subscription không hợp lệ", 400);
      }

      const user_agent = req.headers["user-agent"];
      const result = await PushNotificationService.subscribe(
        user_id,
        subscription,
        user_agent,
      );

      sendSuccess(res, result, "Đăng ký nhận thông báo thành công", 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/push/unsubscribe
   * User tắt notification / browser hủy subscription.
   * Body: { endpoint: string }
   */
  static async unsubscribe(req, res, next) {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return sendError(res, "Thiếu endpoint", 400);
      }

      const deleted = await PushNotificationService.unsubscribe(endpoint);
      if (!deleted) {
        return sendError(res, "Không tìm thấy subscription", 404);
      }

      sendSuccess(res, null, "Đã hủy đăng ký nhận thông báo");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/push/test
   * Gửi push thử nghiệm đến chính user đang đăng nhập.
   * Chỉ dùng khi dev/test — nên giới hạn bằng permission nếu cần.
   */
  static async sendTest(req, res, next) {
    try {
      const user_id = req.user.id;

      const result = await PushNotificationService.sendToUser(user_id, {
        title: "🔔 Push Notification hoạt động!",
        body: "BE đã gửi push thành công. Click để mở ứng dụng.",
        url: "/",
        tag: "test-push",
        actions: [
          { action: "view", title: "Mở ứng dụng" },
          { action: "dismiss", title: "Đóng" },
        ],
      });

      sendSuccess(res, result, "Đã gửi push notification thử nghiệm");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PushController;
