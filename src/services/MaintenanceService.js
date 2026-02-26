const BaoTri = require("../models/BaoTri");
const NhacNho = require("../models/NhacNho");
const Notification = require("../models/Notification");
const User = require("../models/User");
const PushNotificationService = require("./pushNotification.service");
const logger = require("../utils/logger");

class MaintenanceService {
  // Tạo phiếu bảo trì
  static async createMaintenanceRecord(data) {
    const phieu = await BaoTri.create(data);

    // Sau khi bảo trì, có thể tự động tạo nhắc nhở cho lần sau (ví dụ sau 2000km)
    const nextKM = parseInt(data.so_km_hien_tai) + 2000;
    await NhacNho.create({
      loai_nhac: "BAO_TRI",
      ma_serial: data.ma_serial,
      ma_doi_tac: data.ma_doi_tac,
      ngay_nhac_nho: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Dự kiến 2 tháng sau
      so_km_nhac_nho: nextKM,
      noi_dung: `Nhắc lịch bảo trì định kỳ cho xe ${data.ma_serial} tại mốc ${nextKM}km`,
    });

    return phieu;
  }

  // Chạy trình nhắc nhở hàng ngày
  static async runDailyReminders() {
    logger.info("Running daily maintenance & birthday reminders...");

    const reminders = await NhacNho.getPending();
    const birthdays = await NhacNho.getBirthdaysThisMonth();

    // Lấy danh sách nhân viên để thông báo (ví dụ nhân viên ADMIN, QUAN_LY, KHO)
    const employees = await User.getAll({ status: true });
    // Lọc những người có vai trò phù hợp
    const targetUserIds = employees
      .filter((u) => ["ADMIN", "QUAN_LY", "KHO"].includes(u.vai_tro))
      .map((u) => u.id);

    // 1. Xử lý nhắc bảo trì/nhắc nhở đã đặt lịch
    for (const reminder of reminders) {
      const title =
        reminder.loai_nhac === "BAO_TRI"
          ? "🔔 Nhắc lịch bảo trì"
          : "🎂 Nhắc sinh nhật khách hàng";
      const content = `${reminder.noi_dung}. KH: ${reminder.ten_doi_tac} (${reminder.dien_thoai})`;

      await this.notifyEmployees(
        targetUserIds,
        title,
        content,
        "/maintenance/reminders",
      );
      await NhacNho.markAsSent(reminder.id);
    }

    // 2. Kiểm tra sinh nhật hôm nay (nếu chưa có trong tm_nhac_nho)
    const today = new Date();
    const todayStr = today.toISOString().slice(5, 10); // "MM-DD"

    for (const customer of birthdays) {
      if (
        customer.ngay_sinh &&
        customer.ngay_sinh.toISOString().slice(5, 10) === todayStr
      ) {
        const title = "🎂 Sinh nhật khách hàng hôm nay";
        const content = `Hôm nay là sinh nhật khách hàng ${customer.ten_doi_tac} (${customer.dien_thoai}). Hãy gửi lời chúc mừng!`;

        await this.notifyEmployees(targetUserIds, title, content, "/customers");
      }
    }

    return { remindersSent: reminders.length };
  }

  // Gửi thông báo cho nhân viên
  static async notifyEmployees(userIds, title, content, link) {
    for (const userId of userIds) {
      try {
        // Lưu thông báo vào DB
        await Notification.create({
          user_id: userId,
          title,
          content,
          type: "MAINTENANCE",
          link,
        });

        // Gửi Push Notification (Real-time)
        await PushNotificationService.sendToUser(userId, {
          title,
          body: content,
          url: link,
        });
      } catch (err) {
        logger.error(`Failed to notify user ${userId}:`, err);
      }
    }
  }
}

module.exports = MaintenanceService;
