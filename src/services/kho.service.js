
const { query } = require('../config/database');

class Kho {
  // Lấy tất cả kho
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        id, ma_kho, ten_kho, dia_chi, dien_thoai,
        mac_dinh, chinh, daily, status,
        ngay_tao, ngay_cap_nhat
      FROM sys_kho
      WHERE status = TRUE
    `;
    
    const params = [];
    
    if (filters.chinh !== undefined) {
      params.push(filters.chinh);
      sql += ` AND chinh = $${params.length}`;
    }
    
    if (filters.daily !== undefined) {
      params.push(filters.daily);
      sql += ` AND daily = $${params.length}`;
    }
    
    sql += ' ORDER BY chinh DESC, daily DESC, ten_kho ASC';
    
    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy kho theo mã
  static async getByMaKho(ma_kho) {
    const result = await query(
      'SELECT * FROM sys_kho WHERE ma_kho = $1 AND status = TRUE',
      [ma_kho]
    );
    return result.rows[0];
  }

  // Tạo kho mới
  static async create(data) {
  const {
    ma_kho, ten_kho, dia_chi, dien_thoai,
    mac_dinh, loai_kho, ghi_chu
  } = data;
  let chinh = false;
  let daily = false ;
  if(loai_kho ==="CHINH") chinh = true;
  if(loai_kho ==="DAILY") daily = true;
  const result = await query(
    `INSERT INTO sys_kho (
      ma_kho, ten_kho, dia_chi, dien_thoai,
      mac_dinh, chinh, daily, ghi_chu, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, TRUE)
    RETURNING *`,
    [ma_kho, ten_kho, dia_chi, dien_thoai, mac_dinh, chinh, daily, ghi_chu]
  );

  return result.rows[0];
}


  // Cập nhật kho
  static async update(ma_kho, data) {
    const { ten_kho, dia_chi, dien_thoai, mac_dinh, chinh, daily, ghi_chu } = data;
    
    const result = await query(
      `UPDATE sys_kho 
       SET ten_kho = $1, dia_chi = $2, dien_thoai = $3,
           mac_dinh = $4, chinh = $5, daily = $6, ghi_chu = $7
       WHERE ma_kho = $8 AND status = TRUE
       RETURNING *`,
      [ten_kho, dia_chi, dien_thoai, mac_dinh, chinh, daily, ghi_chu, ma_kho]
    );
    
    return result.rows[0];
  }

  // Xóa mềm
  static async softDelete(ma_kho) {
  const result = await query(
    'UPDATE sys_kho SET status = FALSE WHERE ma_kho = $1 RETURNING *',
    [ma_kho]
  );

  return result.rows[0];
}

  // Kiểm tra kho có tồn tại không
  static async exists(ma_kho) {
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM sys_kho WHERE ma_kho = $1 AND status = TRUE)',
      [ma_kho]
    );
    return result.rows[0].exists;
  }
}

module.exports = Kho;

