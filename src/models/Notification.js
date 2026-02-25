const { query } = require("../config/database");

class Notification {
  static async create(data) {
    const { user_id, title, content, type, link } = data;
    const result = await query(
      `INSERT INTO tm_notifications (user_id, title, content, type, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, title, content, type, link],
    );
    return result.rows[0];
  }

  static async getByUser(user_id, limit = 20, offset = 0) {
    const result = await query(
      `SELECT n.*, count(*) OVER() as total_count
       FROM tm_notifications n
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset],
    );

    const unreadResult = await query(
      `SELECT count(*) as unread_count
       FROM tm_notifications
       WHERE user_id = $1 AND is_read = false`,
      [user_id],
    );

    return {
      notifications: result.rows,
      totalCount:
        result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
      unreadCount: parseInt(unreadResult.rows[0].unread_count) || 0,
    };
  }

  static async markAsRead(id, user_id) {
    const result = await query(
      `UPDATE tm_notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, user_id],
    );
    return result.rows[0];
  }

  static async markAllAsRead(user_id) {
    await query(
      `UPDATE tm_notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [user_id],
    );
    return true;
  }

  static async delete(id, user_id) {
    const result = await query(
      `DELETE FROM tm_notifications
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, user_id],
    );
    return result.rowCount > 0;
  }
}

module.exports = Notification;
