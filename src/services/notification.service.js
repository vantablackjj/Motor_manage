const Notification = require("../models/Notification");
const { query } = require("../config/database");
// Lazy-require để tránh circular dependency (push service cũng có thể dùng notification)
let PushNotificationService = null;
const getPushService = () => {
  if (!PushNotificationService) {
    PushNotificationService = require("./pushNotification.service");
  }
  return PushNotificationService;
};

class NotificationService {
  static io = null;

  static setIo(io) {
    this.io = io;
  }

  static async createNotification(data) {
    const notification = await Notification.create(data);

    // 1. Real-time via Socket.io (chỉ hoạt động khi user đang mở tab)
    if (this.io) {
      this.io.to(`user_${data.user_id}`).emit("new_notification", notification);
    }

    // 2. Web Push (hoạt động kể cả khi user ĐÓNG tab / tắt màn hình)
    // Không await để không block response — lỗi push sẽ chỉ log, không throw
    getPushService()
      .sendToUser(data.user_id, {
        title: data.title,
        body: data.content,
        url: data.link || "/",
        tag: `notification-${notification.id}`,
        data: { notification_id: notification.id, link: data.link },
      })
      .catch((err) => {
        const logger = require("../utils/logger");
        logger.error("Push notification background error:", err.message);
      });

    return notification;
  }

  static async getNotifications(user_id, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return await Notification.getByUser(user_id, limit, offset);
  }

  static async markAsRead(id, user_id) {
    return await Notification.markAsRead(id, user_id);
  }

  static async markAllAsRead(user_id) {
    return await Notification.markAllAsRead(user_id);
  }

  static async deleteNotification(id, user_id) {
    return await Notification.delete(id, user_id);
  }

  // --- Specialized notification methods ---

  static async notifyManagers(title, content, link, type = "SYSTEM") {
    // Get all users with QUAN_LY, ADMIN or KE_TOAN role
    const managers = await query(
      `SELECT u.id FROM sys_user u
       LEFT JOIN sys_role r ON u.role_id = r.id
       WHERE r.ten_quyen IN ('QUAN_LY', 'ADMIN', 'KE_TOAN')
          OR u.vai_tro IN ('QUAN_LY', 'ADMIN', 'KE_TOAN')`,
    );

    const notifications = [];
    for (const manager of managers.rows) {
      notifications.push(
        await this.createNotification({
          user_id: manager.id,
          title,
          content,
          link,
          type,
        }),
      );
    }
    return notifications;
  }

  static async notifyWarehouseStaff(ma_kho, title, content, link, type = "SYSTEM") {
    // Get users in this warehouse with KHO or BAN_HANG role
    const staff = await query(
      `SELECT u.id FROM sys_user u
       LEFT JOIN sys_role r ON u.role_id = r.id
       WHERE u.ma_kho = $1 
         AND (r.ten_quyen IN ('KHO', 'BAN_HANG') OR u.vai_tro IN ('KHO', 'BAN_HANG'))`,
      [ma_kho],
    );

    const notifications = [];
    for (const s of staff.rows) {
      notifications.push(
        await this.createNotification({
          user_id: s.id,
          title,
          content,
          link,
          type,
        }),
      );
    }
    return notifications;
  }

  static async notifyUser(user_id, title, content, link, type = "SYSTEM") {
    return await this.createNotification({
      user_id,
      title,
      content,
      link,
      type,
    });
  }
}

module.exports = NotificationService;
