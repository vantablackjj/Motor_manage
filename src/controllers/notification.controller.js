const NotificationService = require("../services/notification.service");

class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const user_id = req.user.id;
      const { page, limit } = req.query;
      const data = await NotificationService.getNotifications(
        user_id,
        parseInt(page) || 1,
        parseInt(limit) || 20,
      );
      res.json({
        success: true,
        data: data.notifications,
        pagination: {
          total: data.totalCount,
          unread: data.unreadCount,
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 20,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      const notification = await NotificationService.markAsRead(id, user_id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông báo hoặc bạn không có quyền",
        });
      }
      res.json({
        success: true,
        message: "Đã đánh dấu là đã đọc",
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      const user_id = req.user.id;
      await NotificationService.markAllAsRead(user_id);
      res.json({
        success: true,
        message: "Đã đánh dấu tất cả là đã đọc",
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      const success = await NotificationService.deleteNotification(id, user_id);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông báo hoặc bạn không có quyền",
        });
      }
      res.json({
        success: true,
        message: "Đã xóa thông báo",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;
