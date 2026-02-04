// services/noiSx.service.js
const { query } = require("../config/database");

class NoiSxService {
  // Lấy danh sách nơi sản xuất
  static async getAll(filters = {}) {
    let sql = `SELECT id, ma, ten_noi_sx, status FROM dm_noi_sx WHERE 1=1`;
    const params = [];

    if (filters.status !== undefined) {
      if (String(filters.status) === "all") {
        // Return ALL
      } else {
        sql += ` AND status = $1`;
        params.push(filters.status === "true" || filters.status === true);
      }
    } else {
      // Default: Only Active
      sql += ` AND status = true`;
    }

    sql += ` ORDER BY ten_noi_sx`;
    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy theo mã (Code)
  static async getById(code) {
    const result = await query(`SELECT * FROM dm_noi_sx WHERE ma = $1`, [code]);
    return result.rows[0];
  }

  // Tạo mới
  static async create(data) {
    const exists = await query(`SELECT 1 FROM dm_noi_sx WHERE ma = $1`, [
      data.ma,
    ]);

    if (exists.rows.length) {
      throw new Error("Mã nơi sản xuất đã tồn tại");
    }

    const result = await query(
      `INSERT INTO dm_noi_sx (ma, ten_noi_sx, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.ma, data.ten_noi_sx, data.status || true],
    );

    return result.rows[0];
  }

  // Cập nhật
  static async update(code, data) {
    const exists = await this.getById(code);
    if (!exists) {
      throw new Error("Nơi sản xuất không tồn tại");
    }

    const result = await query(
      `UPDATE dm_noi_sx
       SET ten_noi_sx = COALESCE($1, ten_noi_sx),
           ma = COALESCE($2, ma),
           status = COALESCE($3, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE ma = $4
       RETURNING *`,
      [data.ten_noi_sx, data.ma, data.status, code],
    );

    return result.rows[0];
  }

  // Xóa
  static async delete(code) {
    const result = await query(
      `UPDATE dm_noi_sx SET status = false, updated_at = CURRENT_TIMESTAMP WHERE ma = $1 RETURNING *`,
      [code],
    );
    return result.rows[0];
  }
}

module.exports = NoiSxService;
