// services/noiSx.service.js
const { query } = require('../config/database');

class NoiSxService {
  // Lấy danh sách nơi sản xuất
  static async getAll() {
    const result = await query(`
      SELECT id, ma, ten_noi_sx, status
      FROM sys_noi_sx
      ORDER BY ten_noi_sx
    `);
    return result.rows;
  }

  // Lấy theo mã
  static async getById(id) {
    const result = await query(
      `SELECT * FROM sys_noi_sx WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Tạo mới
  static async create(data) {
    const exists = await query(
      `SELECT 1 FROM sys_noi_sx WHERE ma = $1`,
      [data.ma]
    );

    if (exists.rows.length) {
      throw new Error('Mã nơi sản xuất đã tồn tại');
    }

    const result = await query(
      `INSERT INTO sys_noi_sx (ma, ten_noi_sx, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.ma, data.ten_noi_sx, data.status]
    );

    return result.rows[0];
  }

  // Cập nhật
  static async update(id, data) {
    const exists = await this.getById(id);
    if (!exists) {
      throw new Error('Nơi sản xuất không tồn tại');
    }

    const result = await query(
      `UPDATE sys_noi_sx
       SET ten_noi_sx = $1,
           ma = $2
       WHERE id = $3
       RETURNING *`,
      [data.ten_noi_sx, data.ma, id]
    );

    return result.rows[0];
  }

  // Xóa
  static async delete(id) {
    const result = await query(
      `DELETE FROM sys_noi_sx WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = NoiSxService;
