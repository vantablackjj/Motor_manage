const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const logger = require("../utils/logger");

/**
 * PushNotificationService
 * ─────────────────────────────────────────────────────────────
 * Quản lý toàn bộ việc gửi Web Push Notification thông qua
 * thư viện `web-push` sử dụng giao thức VAPID.
 *
 * Luồng hoạt động:
 *  Browser đăng ký → /api/push/subscribe → lưu vào DB
 *  Backend tạo notification → NotificationService.createNotification()
 *    → gọi PushNotificationService.sendToUser() → web-push → Browser
 */
class PushNotificationService {
  static initialized = false;

  /**
   * Khởi tạo VAPID keys cho web-push. Phải gọi 1 lần khi start server.
   */
  static init() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject =
      process.env.VAPID_SUBJECT || "mailto:admin@motor-manage.com";

    if (!publicKey || !privateKey) {
      logger.warn(
        "⚠️  VAPID keys not configured. Push notifications will be disabled. " +
          "Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env",
      );
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.initialized = true;
    logger.info("✅ Web Push (VAPID) initialized");
  }

  /**
   * Gửi push notification đến tất cả thiết bị đang subscribe của một user.
   *
   * @param {number} user_id
   * @param {object} payload - { title, body, icon, badge, tag, url, actions }
   */
  static async sendToUser(user_id, payload) {
    if (!this.initialized) return;
    const subscriptions = await PushSubscription.getActiveByUserId(user_id);
    return this._sendBatch(subscriptions, payload);
  }

  /**
   * Gửi push notification đến danh sách users (batch).
   *
   * @param {number[]} user_ids
   * @param {object} payload
   */
  static async sendToUsers(user_ids, payload) {
    if (!this.initialized || !user_ids?.length) return;
    const subscriptions = await PushSubscription.getActiveByUserIds(user_ids);
    return this._sendBatch(subscriptions, payload);
  }

  /**
   * Gửi push notification đến tất cả Quản lý / Admin.
   */
  static async sendToManagers(payload) {
    if (!this.initialized) return;
    const subscriptions = await PushSubscription.getManagerSubscriptions();
    return this._sendBatch(subscriptions, payload);
  }

  /**
   * Gửi hàng loạt đến danh sách subscriptions.
   * - Tự xử lý lỗi 410 (endpoint hết hạn) bằng cách deactivate subscription.
   * - Không throw nếu 1 push thất bại, tiếp tục các push còn lại.
   *
   * @param {Array} subscriptions - [{ endpoint, p256dh, auth }]
   * @param {object} payload
   */
  static async _sendBatch(subscriptions, payload) {
    if (!subscriptions?.length) return { sent: 0, failed: 0 };

    const pushPayload = JSON.stringify({
      title: payload.title || "Thông báo mới",
      body: payload.body || "",
      icon: payload.icon || "/icon-192x192.png",
      badge: payload.badge || "/badge-72x72.png",
      tag: payload.tag || "motor-manage-notification",
      url: payload.url || "/",
      // Action buttons hiển thị trên notification (hỗ trợ bởi Chrome trên Desktop/Android)
      actions: payload.actions || [
        { action: "view", title: "Xem ngay" },
        { action: "dismiss", title: "Bỏ qua" },
      ],
      data: payload.data || {},
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload,
        ),
      ),
    );

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const sub = subscriptions[i];

      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        const statusCode = result.reason?.statusCode;

        if (statusCode === 410 || statusCode === 404) {
          // Subscription đã bị thu hồi bởi browser — deactivate để không gửi lại lần sau
          logger.info(
            `🗑️  Deactivating expired push subscription: ${sub.endpoint.slice(0, 50)}...`,
          );
          await PushSubscription.deactivate(sub.endpoint).catch(() => {});
        } else {
          logger.error("Push notification failed:", {
            endpoint: sub.endpoint.slice(0, 50),
            error: result.reason?.message,
            statusCode,
          });
        }
      }
    }

    logger.info(
      `📤 Push batch: ${sent} sent, ${failed} failed (total: ${subscriptions.length})`,
    );
    return { sent, failed };
  }

  /**
   * Lưu hoặc cập nhật subscription từ browser.
   */
  static async subscribe(user_id, subscriptionObj, user_agent) {
    const { endpoint, keys } = subscriptionObj;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error("Invalid subscription object: missing endpoint or keys");
    }
    return PushSubscription.upsert({
      user_id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent,
    });
  }

  /**
   * Hủy subscription (user tắt notification).
   */
  static async unsubscribe(endpoint) {
    return PushSubscription.deleteByEndpoint(endpoint);
  }

  /**
   * Trả về VAPID public key để FE dùng khi gọi pushManager.subscribe()
   */
  static getPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}

module.exports = PushNotificationService;
