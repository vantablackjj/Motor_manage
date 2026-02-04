const { query } = require("../config/database");

class loaiHinhService {
  static async getAll(filters = {}) {
    let sql = `SELECT ma_lh, ten_lh, status, id FROM dm_loai_hinh WHERE 1=1`;
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

    sql += ` ORDER BY ten_lh`;

    const result = await query(sql, params);
    return result.rows;
  }

  static async getByID(code) {
    const result = await query(
      `
            select * from dm_loai_hinh
            where ma_lh = $1
            `,
      [code],
    );
    return result.rows[0];
  }

  static async create(data) {
    const checkExsits = await query(
      `
                Select 1 from dm_loai_hinh 
                where ma_lh = $1    
            `,
      [data.ma_lh],
    );
    if (checkExsits.rows.length > 0) {
      throw new Error("loại hình đã tồn tại");
    }
    const result = await query(
      `
                insert into dm_loai_hinh(ma_lh,ten_lh,status)
                Values($1,$2,$3)
                Returning *    
            `,
      [data.ma_lh, data.ten_lh, data.status || true],
    );
    return result.rows[0];
  }

  static async update(code, data) {
    const result = await query(
      `UPDATE dm_loai_hinh
       SET ma_lh=COALESCE($1, ma_lh), ten_lh=COALESCE($2, ten_lh), status=COALESCE($3, status), updated_at = CURRENT_TIMESTAMP
       WHERE ma_lh=$4
       RETURNING *`,
      [data.ma_lh, data.ten_lh, data.status, code],
    );
    return result.rows[0];
  }

  static async delete(code) {
    const result = await query(
      `UPDATE dm_loai_hinh
             SET status = false, updated_at = CURRENT_TIMESTAMP
             WHERE ma_lh = $1
             RETURNING *`,
      [code],
    );
    return result.rows[0];
  }
}

module.exports = loaiHinhService;
