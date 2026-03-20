const { query } = require("../config/database");

class ActivityLog {
  static async create(data) {
    const {
      user_id,
      username,
      action,
      module,
      target_id,
      details,
      ip_address,
      user_agent,
    } = data;

    const result = await query(
      `INSERT INTO sys_activity_log (
        user_id, username, action, module, target_id, details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        user_id,
        username,
        action,
        module,
        target_id,
        details,
        ip_address,
        user_agent,
      ],
    );
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    let sql = `SELECT * FROM sys_activity_log WHERE 1=1`;
    const params = [];

    if (filters.user_id) {
      params.push(filters.user_id);
      sql += ` AND user_id = $${params.length}`;
    }
    if (filters.module) {
      params.push(filters.module);
      sql += ` AND module = $${params.length}`;
    }
    if (filters.action) {
      params.push(filters.action);
      sql += ` AND action = $${params.length}`;
    }
    if (filters.username) {
      params.push(`%${filters.username}%`);
      sql += ` AND username ILIKE $${params.length}`;
    }

    sql += " ORDER BY created_at DESC LIMIT 1000";

    const result = await query(sql, params);
    return result.rows;
  }
}

module.exports = ActivityLog;
