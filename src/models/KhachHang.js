
const { query } = require('../config/database');

class KhachHang {
  // Lấy tất cả khách hàng
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        id, ma_kh, ho_ten, dai_dien, ngay_sinh, ma_so_thue,
        so_cmnd, dia_chi, dien_thoai, email, la_ncc, ngay_tao
      FROM tm_khach_hang
      WHERE status = TRUE
    `;
    
    const params = [];
    
    if (filters.la_ncc !== undefined) {
      params.push(filters.la_ncc);
      sql += ` AND la_ncc = $${params.length}`;
    }
    
    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (ho_ten ILIKE $${params.length} OR ma_kh ILIKE $${params.length} OR dien_thoai ILIKE $${params.length})`;
    }
    
    sql += ' ORDER BY ho_ten ASC';
    
    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy khách hàng theo mã
  static async getByMaKH(ma_kh) {
    const result = await query(
      'SELECT * FROM tm_khach_hang WHERE ma_kh = $1 AND status = TRUE',
      [ma_kh]
    );
    return result.rows[0];
  }

  // Tạo khách hàng mới
  static async create(data) {
    const {
      ma_kh, ho_ten, dai_dien, ngay_sinh, ma_so_thue, so_cmnd,
      dia_chi, dien_thoai, bang_lai, ho_khau, email, 
      tai_khoan, ngan_hang, ghi_chu, la_ncc
    } = data;
    
    const result = await query(
      `INSERT INTO tm_khach_hang (
        ma_kh, ho_ten, dai_dien, ngay_sinh, ma_so_thue, so_cmnd,
        dia_chi, dien_thoai, bang_lai, ho_khau, email,
        tai_khoan, ngan_hang, ghi_chu, la_ncc
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        ma_kh, ho_ten, dai_dien, ngay_sinh, ma_so_thue, so_cmnd,
        dia_chi, dien_thoai, bang_lai, ho_khau, email,
        tai_khoan, ngan_hang, ghi_chu, la_ncc
      ]
    );
    
    return result.rows[0];
  }

  // Cập nhật khách hàng
  static async update(ma_kh, data) {
    const {
      ho_ten, dai_dien, ngay_sinh, ma_so_thue, so_cmnd,
      dia_chi, dien_thoai, bang_lai, ho_khau, email,
      tai_khoan, ngan_hang, ghi_chu, la_ncc
    } = data;
    
    const result = await query(
      `UPDATE tm_khach_hang
       SET ho_ten = $1, dai_dien = $2, ngay_sinh = $3, ma_so_thue = $4,
           so_cmnd = $5, dia_chi = $6, dien_thoai = $7, bang_lai = $8,
           ho_khau = $9, email = $10, tai_khoan = $11, ngan_hang = $12,
           ghi_chu = $13, la_ncc = $14
       WHERE ma_kh = $15 AND status = TRUE
       RETURNING *`,
      [
        ho_ten, dai_dien, ngay_sinh, ma_so_thue, so_cmnd,
        dia_chi, dien_thoai, bang_lai, ho_khau, email,
        tai_khoan, ngan_hang, ghi_chu, la_ncc, ma_kh
      ]
    );
    
    return result.rows[0];
  }

  // Xóa mềm
  static async softDelete(ma_kh) {
    const result = await query(
      'UPDATE tm_khach_hang SET status = FALSE WHERE ma_kh = $1 RETURNING *',
      [ma_kh]
    );
    return result.rows[0];
  }

  // Kiểm tra khách hàng có tồn tại không
  static async exists(ma_kh) {
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM tm_khach_hang WHERE ma_kh = $1 AND status = TRUE)',
      [ma_kh]
    );
    return result.rows[0].exists;
  }
}

module.exports = KhachHang;

-