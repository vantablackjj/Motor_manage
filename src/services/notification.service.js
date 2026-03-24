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

  /**
   * Notify Managers and Accountants who have access to specific warehouse(s)
   * @param {string} title 
   * @param {string} content 
   * @param {string} link 
   * @param {string} type 
   * @param {string|string[]} ma_kho - Optional warehouse code(s) to filter recipients
   */
  static async notifyManagers(title, content, link, type = "SYSTEM", ma_kho = null) {
    // Get all users with QUAN_LY, ADMIN or KE_TOAN role
    // Filter by warehouse if provided (Admins always get notified)
    let queryStr = `
      SELECT DISTINCT u.id FROM sys_user u
      LEFT JOIN sys_role r ON u.role_id = r.id
      LEFT JOIN sys_user_kho uk ON u.id = uk.user_id
      WHERE (r.ten_quyen IN ('QUAN_LY', 'ADMIN', 'KE_TOAN') OR u.vai_tro IN ('QUAN_LY', 'ADMIN', 'KE_TOAN'))
    `;

    const params = [];
    if (ma_kho) {
      const ma_kho_arr = Array.isArray(ma_kho) ? ma_kho : [ma_kho];
      params.push(ma_kho_arr);
      queryStr += ` AND (u.vai_tro = 'ADMIN' OR u.ma_kho = ANY($1::text[]) OR uk.ma_kho = ANY($1::text[]))`;
    }

    const managers = await query(queryStr, params);

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

  /**
   * Notify Warehouse Staff (KHO/BAN_HANG) who have access to a specific warehouse
   * @param {string} ma_kho 
   * @param {string} title 
   * @param {string} content 
   * @param {string} link 
   * @param {string} type 
   */
  static async notifyWarehouseStaff(ma_kho, title, content, link, type = "SYSTEM") {
    // Get users with access to this warehouse and role KHO or BAN_HANG
    const staff = await query(
      `SELECT DISTINCT u.id FROM sys_user u
       LEFT JOIN sys_role r ON u.role_id = r.id
       LEFT JOIN sys_user_kho uk ON u.id = uk.user_id
       WHERE (u.ma_kho = $1 OR uk.ma_kho = $1)
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
