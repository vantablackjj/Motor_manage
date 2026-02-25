const Notification = require("../models/Notification");
const { query } = require("../config/database");

class NotificationService {
  static io = null;

  static setIo(io) {
    this.io = io;
  }

  static async createNotification(data) {
    const notification = await Notification.create(data);

    // Push via socket if available
    if (this.io) {
      this.io.to(`user_${data.user_id}`).emit("new_notification", notification);
    }

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
    // Get all users with QUAN_LY or ADMIN role
    const managers = await query(
      `SELECT u.id FROM sys_user u
       LEFT JOIN sys_role r ON u.role_id = r.id
       WHERE r.ma_quyen IN ('QUAN_LY', 'QUAN_LY_CTY', 'QUAN_LY_CHI_NHANH', 'ADMIN') 
          OR r.ten_quyen IN ('QUAN_LY', 'QUAN_LY_CTY', 'QUAN_LY_CHI_NHANH', 'ADMIN')
          OR u.vai_tro IN ('QUAN_LY', 'QUAN_LY_CTY', 'QUAN_LY_CHI_NHANH', 'ADMIN')`,
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
