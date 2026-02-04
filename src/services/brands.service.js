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
    // Default to 'XE' (Vehicles) if not specified to preserve backward compatibility
    if (filters.ma_nhom_cha) {
      sql += ` AND ma_nhom_cha = $${idx++}`;
      params.push(filters.ma_nhom_cha);
    } else {
      sql += ` AND ma_nhom_cha = 'XE'`;
    }

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
  static async getById(ma_nh) {
    const result = await query(
      `SELECT id, ma_nhom as ma_nh, ten_nhom as ten_nh, status
             FROM dm_nhom_hang
             WHERE ma_nhom = $1`,
      [ma_nh],
    );
    return result.rows[0];
  }

  // Tạo mới thương hiệu / nhóm hàng
  static async create(data) {
    const { ten_nh, type = "XE" } = data;
    const { generateCode } = require("../ultils/codeGenerator");

    // Generate code
    const ma_nh = await generateCode("dm_nhom_hang", "ma_nhom", "NH");

    // Đảm bảo nhóm cha tồn tại
    if (type === "XE") {
      await query(
        `INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status)
             VALUES ('XE', 'Xe máy', NULL, true)
             ON CONFLICT (ma_nhom) DO NOTHING`,
      );
    } else if (type === "PT") {
      await query(
        `INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status)
             VALUES ('PT', 'Phụ tùng', NULL, true)
             ON CONFLICT (ma_nhom) DO NOTHING`,
      );
    }

    const result = await query(
      `INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status)
             VALUES ($1, $2, $3, true)
             RETURNING id, ma_nhom as ma_nh, ten_nhom as ten_nh, status, ma_nhom_cha`,
      [ma_nh, String(ten_nh).trim(), type],
    );
    return result.rows[0];
  }

  // Cập nhật
  static async update(ma_nh_old, data) {
    const { ma_nh, ten_nh } = data;
    const exists = await this.getById(ma_nh_old);
    if (!exists) throw new Error("Thương hiệu/Nhóm hàng không tồn tại");

    const result = await query(
      `UPDATE dm_nhom_hang
             SET ma_nhom = $1,
                 ten_nhom = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE ma_nhom = $3
             RETURNING id, ma_nhom as ma_nh, ten_nhom as ten_nh, status`,
      [String(ma_nh).trim(), String(ten_nh).trim(), ma_nh_old],
    );
    return result.rows[0];
  }

  // Xóa mềm
  static async delete(ma_nh) {
    const exists = await this.getById(ma_nh);
    if (!exists) throw new Error("Thương hiệu/Nhóm hàng không tồn tại");

    const result = await query(
      `UPDATE dm_nhom_hang
             SET status = false,
                 updated_at = CURRENT_TIMESTAMP
             WHERE ma_nhom = $1
             RETURNING id, ma_nhom as ma_nh, ten_nhom as ten_nh, status`,
      [ma_nh],
    );
    return result.rows[0];
  }
}

module.exports = BrandService;
