// services/color.service.js
const { query } = require('../config/database');

class ColorService {
  // Lấy danh sách màu
  static async getAll() {
    const result = await query(
      `SELECT ma_mau, ten_mau, gia_tri, mac_dinh, status
       FROM sys_mau
       ORDER BY ten_mau`
    );
    return result.rows;
  }

  // Lấy 1 màu
  static async getById(ma_mau) {
    const result = await query(
      `SELECT * FROM sys_mau WHERE ma_mau = $1`,
      [ma_mau]
    );
    return result.rows[0];
  }

  // Tạo màu
  static async create(data) {
    // Check trùng mã
    const exists = await query(
      `SELECT 1 FROM sys_mau WHERE ma_mau = $1`,
      [data.ma_mau]
    );

    if (exists.rows.length > 0) {
      throw new Error('Mã màu đã tồn tại');
    }

    // Nếu là mặc định → bỏ mặc định các màu khác
    if (data.mac_dinh) {
      await query(`UPDATE sys_mau SET mac_dinh = false`);
    }

    const result = await query(
      `INSERT INTO sys_mau (ma_mau, ten_mau, gia_tri, mac_dinh, status)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        data.ma_mau,
        data.ten_mau,
        data.gia_tri,
        data.mac_dinh,
        data.status,
      ]
    );

    return result.rows[0];
  }


static async update(ma_mau, data) {
  
  const trimmedMaMau = String(ma_mau).trim();
  console.log("Updating color with ma_mau:", JSON.stringify(trimmedMaMau));

  const exists = await this.getById(trimmedMaMau);
  if (!exists) {
    throw new Error('Màu không tồn tại');
  }


  if (data.mac_dinh) {
    await query(`UPDATE sys_mau SET mac_dinh = false`);
  }

  // Cập nhật màu
  const result = await query(
    `UPDATE sys_mau
     SET ten_mau=$1, gia_tri=$2, mac_dinh=$3, status=$4
     WHERE ma_mau=$5
     RETURNING *`,
    [
      data.ten_mau,
      data.gia_tri,
      data.mac_dinh,
      data.status,
      trimmedMaMau,
    ]
  );

  return result.rows[0];
}


  // Xóa
  static async delete(id) {
    const result = await query(
      `DELETE FROM sys_mau WHERE id=$1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = ColorService;
