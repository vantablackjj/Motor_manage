
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const {pool} = require('../config/database')
class User {
  // Lấy user theo username
  static async getByUsername(username) {
    const result = await query(
      `SELECT u.*, k.ten_kho 
       FROM sys_user u
       LEFT JOIN sys_kho k ON u.ma_kho = k.ma_kho
       WHERE u.username = $1 AND u.trang_thai = TRUE`,
      [username]
    );
    return result.rows[0];
  }

  // Lấy user theo ID
  static async getById(id) {
    const result = await query(
      `SELECT u.id, u.username, u.ho_ten, u.email, u.dien_thoai,
              u.vai_tro, u.ma_kho, k.ten_kho, u.ngay_tao, u.lan_dang_nhap_cuoi
       FROM sys_user u
       LEFT JOIN sys_kho k ON u.ma_kho = k.ma_kho
       WHERE u.id = $1 AND u.trang_thai = TRUE`,
      [id]
    );
    return result.rows[0];
  }

  // Lấy tất cả users
  static async getAll(filters = {}) {
    let sql = `
      SELECT u.id, u.username, u.ho_ten, u.email, u.dien_thoai,
             u.vai_tro, u.ma_kho, k.ten_kho, u.trang_thai, u.ngay_tao
      FROM sys_user u
      LEFT JOIN sys_kho k ON u.ma_kho = k.ma_kho
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.vai_tro) {
      params.push(filters.vai_tro);
      sql += ` AND u.vai_tro = $${params.length}`;
    }
    
    if (filters.ma_kho) {
      params.push(filters.ma_kho);
      sql += ` AND u.ma_kho = $${params.length}`;
    }
    
    if (filters.trang_thai !== undefined) {
      params.push(filters.trang_thai);
      sql += ` AND u.trang_thai = $${params.length}`;
    }
    
    sql += ' ORDER BY u.ngay_tao DESC';
    
    const result = await query(sql, params);
    return result.rows;
  }

  // Tạo user mới
  static async create(data) {
    const { username, password, ho_ten, email, dien_thoai, vai_tro, ma_kho } = data;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(
      `INSERT INTO sys_user (
        username, password, ho_ten, email, dien_thoai, vai_tro, ma_kho
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, ho_ten, email, vai_tro, ma_kho, ngay_tao`,
      [username, hashedPassword, ho_ten, email, dien_thoai, vai_tro, ma_kho]
    );
    
    return result.rows[0];
  }

  // Cập nhật user
  static async update(id, data) {
    const { ho_ten, email, dien_thoai, vai_tro, ma_kho } = data;
    
    const result = await query(
      `UPDATE sys_user
       SET ho_ten = $1, email = $2, dien_thoai = $3, vai_tro = $4, ma_kho = $5
       WHERE id = $6 AND trang_thai = TRUE
       RETURNING id, username, ho_ten, email, vai_tro, ma_kho`,
      [ho_ten, email, dien_thoai, vai_tro, ma_kho, id]
    );
    
    return result.rows[0];
  }

  // Đổi mật khẩu
  static async changePassword(id, oldPassword, newPassword) {
    // Get current password
    const userResult = await query(
      'SELECT password FROM sys_user WHERE id = $1',
      [id]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User không tồn tại');
    }
    
    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, userResult.rows[0].password);
    if (!isValid) {
      throw new Error('Mật khẩu cũ không đúng');
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update
    await query(
      'UPDATE sys_user SET password = $1 WHERE id = $2',
      [hashedPassword, id]
    );
    
    return true;
  }

  // Update last login
  static async updateLastLogin(id) {
    await query(
      'UPDATE sys_user SET lan_dang_nhap_cuoi = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  // Vô hiệu hóa user
  static async deactivate(id) {
    const result = await query(
      'UPDATE sys_user SET trang_thai = FALSE WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Kích hoạt user
  static async activate(id) {
    const result = await query(
      'UPDATE sys_user SET trang_thai = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Lấy quyền kho của user
  static async getWarehousePermissions(user_id) {
    const result = await query(
      `SELECT uk.*, k.ten_kho
       FROM sys_user_kho uk
       INNER JOIN sys_kho k ON uk.ma_kho = k.ma_kho
       WHERE uk.user_id = $1`,
      [user_id]
    );
    return result.rows;
  }

  // Gán quyền kho cho user
  static async assignWarehouse(user_id, ma_kho, permissions) {
    const {
      quyen_xem = true,
      quyen_them = false,
      quyen_sua = false,
      quyen_xoa = false,
      quyen_chuyen_kho = false
    } = permissions;
    
    const result = await query(
      `INSERT INTO sys_user_kho (
        user_id, ma_kho, quyen_xem, quyen_them, quyen_sua, quyen_xoa, quyen_chuyen_kho
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, ma_kho) 
      DO UPDATE SET
        quyen_xem = $3, quyen_them = $4, quyen_sua = $5, quyen_xoa = $6, quyen_chuyen_kho = $7
      RETURNING *`,
      [user_id, ma_kho, quyen_xem, quyen_them, quyen_sua, quyen_xoa, quyen_chuyen_kho]
    );
    
    return result.rows[0];
  }

  // Xóa quyền kho
  static async removeWarehouse(user_id, ma_kho) {
    await query(
      'DELETE FROM sys_user_kho WHERE user_id = $1 AND ma_kho = $2',
      [user_id, ma_kho]
    );
    return true;
  }
}

module.exports = User;