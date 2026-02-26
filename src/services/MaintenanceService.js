const BaoTri = require("../models/BaoTri");
const NhacNho = require("../models/NhacNho");
const Notification = require("../models/Notification");
const User = require("../models/User");
const PushNotificationService = require("./pushNotification.service");
const logger = require("../utils/logger");
const { query } = require("../config/database");

class MaintenanceService {
  /**
   * Kiểm tra trạng thái bảo hành / bảo trì miễn phí
   * Giả định: 6 tháng hoặc 10,000 km đầu tiên là miễn phí công bảo dưỡng
   */
  static checkWarrantyStatus(ngay_ban, so_km_hien_tai) {
    if (!ngay_ban)
      return { is_eligible: false, reason: "Không có thông tin ngày bán" };

    const sellDate = new Date(ngay_ban);
    const today = new Date();
    const diffMonths =
      (today.getFullYear() - sellDate.getFullYear()) * 12 +
      (today.getMonth() - sellDate.getMonth());

    const KM_LIMIT = 10000;
    const MONTH_LIMIT = 6;

    if (diffMonths <= MONTH_LIMIT && (so_km_hien_tai || 0) <= KM_LIMIT) {
      return {
        is_eligible: true,
        message: "Trong hạn bảo trì miễn phí (Dưới 6 tháng & 10,000km)",
        diffMonths,
        so_km_hien_tai,
      };
    }

    return {
      is_eligible: false,
      message: "Hết hạn bảo trì miễn phí",
      diffMonths,
      so_km_hien_tai,
    };
  }

  /**
   * Kiểm tra xe có trong hệ thống chưa.
   * Nếu chưa → tự động tạo bản ghi xe ngoài
   *   (la_xe_cua_hang = FALSE, trang_thai = 'XE_NGOAI').
   * Trả về { la_xe_cua_hang, da_tao_moi, warranty }
   */
  static async resolveOrRegisterXe(ma_serial, ma_hang_hoa, so_khung) {
    const existing = await query(
      `SELECT ma_serial, la_xe_cua_hang, ngay_ban, so_km_hien_tai 
       FROM tm_hang_hoa_serial WHERE ma_serial = $1`,
      [ma_serial],
    );

    if (existing.rows.length > 0) {
      const xe = existing.rows[0];
      const warranty = this.checkWarrantyStatus(xe.ngay_ban, xe.so_km_hien_tai);
      return {
        la_xe_cua_hang: xe.la_xe_cua_hang,
        da_tao_moi: false,
        warranty,
      };
    }

    // Xe không có → Đăng ký là xe ngoài
    if (!ma_hang_hoa) {
      throw {
        status: 400,
        message:
          "Xe không có trong hệ thống. Vui lòng cung cấp loại xe (ma_hang_hoa) để đăng ký xe ngoài.",
      };
    }

    await query(
      `INSERT INTO tm_hang_hoa_serial (
        ma_serial, ma_hang_hoa, serial_identifier,
        trang_thai, la_xe_cua_hang, ghi_chu
      ) VALUES ($1, $2, $3, 'XE_NGOAI', FALSE,
        'Xe khách mang từ ngoài - tự động đăng ký qua phiếu bảo trì')`,
      [ma_serial, ma_hang_hoa, so_khung || ma_serial],
    );

    logger.info(`[Maintenance] Đã đăng ký xe ngoài: ${ma_serial}`);
    return { la_xe_cua_hang: false, da_tao_moi: true };
  }

  // Tạo phiếu bảo trì
  static async createMaintenanceRecord(data) {
    // Bước 1: Xác định xe / tự động đăng ký nếu là xe ngoài
    const { la_xe_cua_hang, da_tao_moi } = await this.resolveOrRegisterXe(
      data.ma_serial,
      data.ma_hang_hoa, // FE gửi kèm nếu xe chưa có trong hệ thống
      data.so_khung, // Số khung thực tế
    );

    // Bước 2: Tạo phiếu bảo trì
    const phieu = await BaoTri.create(data);

    // Bước 3: Tạo nhắc nhở bảo trì tiếp theo
    const nextKM = parseInt(data.so_km_hien_tai) + 2000;
    await NhacNho.create({
      loai_nhac: "BAO_TRI",
      ma_serial: data.ma_serial,
      ma_doi_tac: data.ma_doi_tac,
      ngay_nhac_nho: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      so_km_nhac_nho: nextKM,
      noi_dung: la_xe_cua_hang
        ? `🏠 [Xe cửa hàng] Nhắc bảo trì định kỳ cho xe ${data.ma_serial} tại mốc ${nextKM}km`
        : `🔧 [Xe ngoài] Nhắc bảo trì cho xe ${data.ma_serial} tại mốc ${nextKM}km`,
    });

    return {
      ...phieu,
      la_xe_cua_hang,
      da_tao_moi_xe_ngoai: da_tao_moi,
    };
  }

  // Chạy trình nhắc nhở hàng ngày
  static async runDailyReminders() {
    logger.info("Running daily maintenance & birthday reminders...");

    const reminders = await NhacNho.getPending();
    const birthdays = await NhacNho.getBirthdaysThisMonth();

    const employees = await User.getAll({ status: true });
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

    // 2. Kiểm tra sinh nhật hôm nay
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
        await Notification.create({
          user_id: userId,
          title,
          content,
          type: "MAINTENANCE",
          link,
        });

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
