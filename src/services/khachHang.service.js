// services/color.service.js
const { query } = require('../config/database');

class khachHangService {
  // Lấy danh sách màu
  static async getAll() {
    const result = await query(
      `SELECT id, ma_kh, ho_ten, dia_chi, dien_thoai, email, ho_khau, status
       FROM tm_khach_hang
       ORDER BY ho_ten`
    );
    return result.rows;
  }


  static async getById(id) {
    const result = await query(
      `SELECT * FROM tm_khach_hang WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async create(data) {
    // Check trùng mã
    const exists = await query(
      `SELECT 1 FROM tm_khach_hang WHERE ma_kh = $1`,
      [data.ma_kh]
    );

    if (exists.rows.length > 0) {
      throw new Error('Mã khách hàng đã tồn tại');
    }

    // Nếu là mặc định → bỏ mặc định các kh khác
    if (data.status === true) {
      await query(`UPDATE tm_khach_hang SET status = false`);
    }

    const result = await query(
      `INSERT INTO tm_khach_hang (ma_kh, ho_ten, dia_chi, dien_thoai, email, ho_khau, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        data.ma_kh,
        data.ho_ten,
        data.dia_chi,
        data.dien_thoai,
        data.email,
        data.ho_khau,
        data.status,
      ]
    );

    return result.rows[0];
  }

  // Cập nhật
  static async update(id, data) {
    const exists = await this.getById(id);
    if (!exists) {
      throw new Error('Khách hàng không tồn tại');
    }

    if (data.status === false) {
      await query(`UPDATE tm_khach_hang SET status = false`);
    }

    const result = await query(
      `UPDATE tm_khach_hang
       SET ho_ten=$1, dia_chi=$2, dien_thoai=$3, email=$4, ho_khau=$5, status=$6
       WHERE ma_kh=$7
       RETURNING *`,
      [
        data.ho_ten,
        data.dia_chi,
        data.dien_thoai,
        data.email,
        data.ho_khau,
        data.status,
        ma_kh,
      ]
    );

    return result.rows[0];
  }

  // Xóa
  static async delete(id) {
    const result = await query(
      `DELETE FROM tm_khach_hang WHERE id=$1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = khachHangService;
