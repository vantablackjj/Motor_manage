// services/brands.service.js
const { query } = require('../config/database');

class BrandService {
    // Lấy danh sách thương hiệu đang active
    static async getAll() {
        const result = await query(
            `SELECT id, ma_nh, ten_nh, status
             FROM sys_nhan_hieu
             WHERE status = true
             ORDER BY ten_nh`
        );
        return result.rows;
    }

    // Lấy theo id (chỉ bản ghi active)
    static async getById(id) {
        const result = await query(
            `SELECT * FROM sys_nhan_hieu
             WHERE id = $1 AND status = true`,
            [id]
        );
        return result.rows[0];
    }

    // Tạo mới
    static async create(data) {
        const result = await query(
            `INSERT INTO sys_nhan_hieu (ma_nh, ten_nh, status)
             VALUES ($1, $2, true)
             RETURNING *`,
            [String(data.ma_nh).trim(), String(data.ten_nh).trim()]
        );
        return result.rows[0];
    }

    // Cập nhật
    static async update(id, data) {
        const exists = await this.getById(id);
        if (!exists) throw new Error('Thương hiệu không tồn tại');

        const result = await query(
            `UPDATE sys_nhan_hieu
             SET ma_nh = $1,
                 ten_nh = $2
             WHERE id = $3
             RETURNING *`,
            [String(data.ma_nh).trim(), String(data.ten_nh).trim(), id]
        );
        return result.rows[0];
    }

    // Soft delete
    static async delete(id) {
        const exists = await this.getById(id);
        if (!exists) throw new Error('Thương hiệu không tồn tại');

        const result = await query(
            `UPDATE sys_nhan_hieu
             SET status = false
             WHERE id = $1
             RETURNING *`,
            [id]
        );
        return result.rows[0];
    }
}

module.exports = BrandService;
