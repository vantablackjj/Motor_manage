const { query } = require("../config/database");

class Session {
  static async create(data) {
    const { userId, refreshToken, expiresAt } = data;
    const result = await query(
      `INSERT INTO tm_session (user_id, refresh_token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING *`,
      [userId, refreshToken, expiresAt]
    );
    return result.rows[0];
  }

  static async deleteOne(data) {
    const { refreshToken } = data;
    const result = await query(
      `DELETE FROM tm_session WHERE refresh_token = $1`,
      [refreshToken]
    );
    return result.rows[0];
  }

  static async deleteMany(data) {
    const { userId } = data;
    const result = await query(`DELETE FROM tm_session WHERE user_id = $1`, [
      userId,
    ]);
    return result.rows[0];
  }

  static async getAll() {
    const result = await query("SELECT * FROM tm_session");
    return result.rows;
  }
}

module.exports = Session;
