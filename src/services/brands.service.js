// services/brands.service.js
const { query } = require("../config/database");

class BrandService {
  // Lấy danh sách thương hiệu/nhóm hàng
  static async getAll(filters = {}) {
    let sql = `SELECT id, ma_nhom as ma_nh, ten_nhom as ten_nh, status
             FROM dm_nhom_hang
             WHERE 1=1`;
    const params = [];
    let idx = 1;

    // Filter by Parent Group (ma_nhom_cha)
    // Support both 'ma_nhom_cha' and 'type' query parameters
    const parentGroup = filters.ma_nhom_cha || filters.type;
    if (parentGroup && parentGroup !== "all") {
      sql += ` AND ma_nhom_cha = $${idx++}`;
      params.push(parentGroup);
    }
    // Removed default 'XE' to allow seeing all categories if requested

    // Filter by status
    if (filters.status !== undefined) {
      if (String(filters.status) === "all") {
        // Return ALL (active + deleted)
      } else {
        sql += ` AND status = $${idx++}`;
        params.push(filters.status === "true" || filters.status === true);
      }
    } else {
      // Default: Only Active
      sql += ` AND status = true`;
    }

    sql += ` ORDER BY ten_nhom`;

    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy theo mã thương hiệu (ma_nhom)
  static async getById(ma_nh, ma_nhom_cha = null) {
    let sql = `SELECT id, ma_nhom as ma_nh, ten_nhom as ten_nh, status, ma_nhom_cha
                FROM dm_nhom_hang
                WHERE ma_nhom = $1`;
    const params = [ma_nh];
    if (ma_nhom_cha) {
      sql += ` AND ma_nhom_cha = $2`;
      params.push(ma_nhom_cha);
    }
    const result = await query(sql, params);
    return result.rows[0];
  }

  // Tạo mới thương hiệu
  static async create(data) {
    const { ten_nh, ma_nhom_cha = "XE" } = data;
    const { generateCode } = require("../utils/codeGenerator");

    // Generate code
    const ma_nh = await generateCode("dm_nhom_hang", "ma_nhom", "NH");

    // Check if parent exists
    const parentExists = await query(
      "SELECT 1 FROM dm_nhom_hang WHERE ma_nhom = $1",
      [ma_nhom_cha],
    );

    if (parentExists.rows.length === 0) {
      // Auto-create parent if it's 'XE' or 'PT' for convenience, or throw error for others
      if (ma_nhom_cha === "XE") {
        await query(
          `INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status)
                 VALUES ('XE', 'Xe máy', NULL, true)
                 ON CONFLICT (ma_nhom) DO NOTHING`,
        );
      } else if (ma_nhom_cha === "PT") {
        await query(
          `INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status)
                 VALUES ('PT', 'Phụ tùng', NULL, true)
                 ON CONFLICT (ma_nhom) DO NOTHING`,
        );
      } else {
        throw new Error(`Nhóm cha '${ma_nhom_cha}' không tồn tại`);
      }
    }

    const result = await query(
      `INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status)
             VALUES ($1, $2, $3, true)
             RETURNING id, ma_nhom as ma_nh, ten_nhom as ten_nh, status, ma_nhom_cha`,
      [ma_nh, String(ten_nh).trim(), ma_nhom_cha],
    );
    return result.rows[0];
  }

  // Cập nhật
  static async update(ma_nh_old, data, ma_nhom_cha_old = null) {
    const { ma_nh, ten_nh, status, ma_nhom_cha: ma_nhom_cha_new } = data;
    const exists = await this.getById(ma_nh_old, ma_nhom_cha_old);
    if (!exists) throw new Error("Thương hiệu không tồn tại");

    const real_ma_nhom_cha = exists.ma_nhom_cha;

    const result = await query(
      `UPDATE dm_nhom_hang
             SET ma_nhom = $1,
                 ten_nhom = $2,
                 status = $5,
                 ma_nhom_cha = $6,
                 updated_at = CURRENT_TIMESTAMP
             WHERE ma_nhom = $3 AND (ma_nhom_cha = $4 OR ($4 IS NULL AND ma_nhom_cha IS NULL))
             RETURNING id, ma_nhom as ma_nh, ten_nhom as ten_nh, status, ma_nhom_cha`,
      [
        String(ma_nh || ma_nh_old).trim(),
        String(ten_nh || exists.ten_nh).trim(),
        ma_nh_old,
        real_ma_nhom_cha,
        status !== undefined ? status : exists.status,
        ma_nhom_cha_new !== undefined ? ma_nhom_cha_new : real_ma_nhom_cha,
      ],
    );
    return result.rows[0];
  }

  // Xóa mềm
  static async delete(ma_nh, ma_nhom_cha = null) {
    const exists = await this.getById(ma_nh, ma_nhom_cha);
    if (!exists) throw new Error("Thương hiệu không tồn tại");

    const real_ma_nhom_cha = exists.ma_nhom_cha;

    const result = await query(
      `UPDATE dm_nhom_hang
             SET status = false,
                  updated_at = CURRENT_TIMESTAMP
             WHERE ma_nhom = $1 AND (ma_nhom_cha = $2 OR ($2 IS NULL AND ma_nhom_cha IS NULL))
             RETURNING id, ma_nhom as ma_nh, ten_nhom as ten_nh, status, ma_nhom_cha`,
      [ma_nh, real_ma_nhom_cha],
    );

    if (result.rowCount === 0) {
      throw new Error("Không thể cập nhật trạng thái xóa");
    }

    return result.rows[0];
  }
}

module.exports = BrandService;
