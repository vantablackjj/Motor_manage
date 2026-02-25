const { query } = require("../config/database");

class PushSubscription {
  /**
   * Lưu hoặc cập nhật subscription (upsert theo endpoint).
   * Mỗi lần browser subscribe sẽ gọi API này — nếu endpoint đã tồn tại
   * (ví dụ user đăng ký lại sau khi revoke), ta chỉ cập nhật keys.
   */
  static async upsert({ user_id, endpoint, p256dh, auth, user_agent }) {
    const result = await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id    = EXCLUDED.user_id,
             p256dh     = EXCLUDED.p256dh,
             auth       = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent,
             is_active  = TRUE,
             updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_id, endpoint, p256dh, auth, user_agent || null],
    );
    return result.rows[0];
  }

  /**
   * Xóa subscription theo endpoint (khi user tắt notification trên browser).
   */
  static async deleteByEndpoint(endpoint) {
    const result = await query(
      `DELETE FROM push_subscriptions WHERE endpoint = $1 RETURNING id`,
      [endpoint],
    );
    return result.rowCount > 0;
  }

  /**
   * Lấy tất cả active subscriptions của một user.
   * Dùng khi cần gửi push notification đến mọi thiết bị của user đó.
   */
  static async getActiveByUserId(user_id) {
    const result = await query(
      `SELECT id, endpoint, p256dh, auth FROM push_subscriptions
       WHERE user_id = $1 AND is_active = TRUE`,
      [user_id],
    );
    return result.rows;
  }

  /**
   * Lấy tất cả active subscriptions của nhiều users (gửi hàng loạt).
   */
  static async getActiveByUserIds(user_ids) {
    if (!user_ids || user_ids.length === 0) return [];
    const result = await query(
      `SELECT id, endpoint, p256dh, auth, user_id FROM push_subscriptions
       WHERE user_id = ANY($1) AND is_active = TRUE`,
      [user_ids],
    );
    return result.rows;
  }

  /**
   * Vô hiệu hóa subscription (ví dụ khi push bị lỗi 410 Gone).
   * Thay vì xóa ngay, ta đánh dấu is_active = false để audit.
   */
  static async deactivate(endpoint) {
    await query(
      `UPDATE push_subscriptions SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE endpoint = $1`,
      [endpoint],
    );
  }

  /**
   * Lấy danh sách tất cả subscriptions của users có vai trò QUAN_LY / ADMIN.
   * Tiện lợi khi cần broadcast cho managers.
   */
  static async getManagerSubscriptions() {
    const result = await query(
      `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.user_id
       FROM push_subscriptions ps
       INNER JOIN sys_user u ON ps.user_id = u.id
       WHERE u.vai_tro IN ('QUAN_LY', 'QUAN_LY_CTY', 'QUAN_LY_CHI_NHANH', 'ADMIN')
         AND ps.is_active = TRUE`,
    );
    return result.rows;
  }
}

module.exports = PushSubscription;
