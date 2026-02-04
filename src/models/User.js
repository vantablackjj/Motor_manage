const { query } = require("../config/database");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
class User {
  // Lấy user theo username
  static async getByUsername(username) {
    const result = await query(
      `SELECT u.*, r.ten_quyen as vai_tro
       FROM sys_user u
       LEFT JOIN sys_role r ON u.role_id = r.id
       WHERE u.username = $1 AND u.status = TRUE`,
      [username],
    );
    return result.rows[0];
  }

  // Lấy user theo ID
  static async getById(id) {
    const result = await query(
      `SELECT u.id, u.username, u.ho_ten, u.email, u.dien_thoai,
              r.ten_quyen as vai_tro, u.created_at, u.updated_at
       FROM sys_user u
       LEFT JOIN sys_role r ON u.role_id = r.id
       WHERE u.id = $1 AND u.status = TRUE`,
      [id],
    );
    return result.rows[0];
  }

  // Lấy tất cả users
  static async getAll(filters = {}) {
    let sql = `
      SELECT u.id, u.username, u.ho_ten, u.email, u.dien_thoai,
             r.ten_quyen as vai_tro, u.status, u.created_at
      FROM sys_user u
      LEFT JOIN sys_role r ON u.role_id = r.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.vai_tro) {
      params.push(filters.vai_tro);
      sql += ` AND r.ten_quyen = $${params.length}`;
    }

    if (filters.status !== undefined) {
      params.push(filters.status);
      sql += ` AND u.status = $${params.length}`;
    }

    sql += " ORDER BY u.created_at DESC";

    const result = await query(sql, params);
    return result.rows;
  }

  // Tạo user mới
  static async create(data) {
    const { username, password, ho_ten, email, dien_thoai, role_id } = data;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO sys_user (
        username, password_hash, ho_ten, email, dien_thoai, role_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, ho_ten, email, role_id, created_at`,
      [username, hashedPassword, ho_ten, email, dien_thoai, role_id],
    );

    return result.rows[0];
  }

  // Cập nhật user
  static async update(id, data) {
    const { ho_ten, email, dien_thoai, role_id } = data;

    const result = await query(
      `UPDATE sys_user
       SET ho_ten = $1, email = $2, dien_thoai = $3, role_id = $4
       WHERE id = $5 AND status = TRUE
       RETURNING id, username, ho_ten, email, role_id`,
      [ho_ten, email, dien_thoai, role_id, id],
    );

    return result.rows[0];
  }

  // Đổi mật khẩu
  static async changePassword(id, oldPassword, newPassword) {
    // Get current password
    const userResult = await query(
      "SELECT password_hash FROM sys_user WHERE id = $1",
      [id],
    );

    if (userResult.rows.length === 0) {
      throw new Error("User không tồn tại");
    }

    // Verify old password
    const isValid = await bcrypt.compare(
      oldPassword,
      userResult.rows[0].password_hash,
    );
    if (!isValid) {
      throw new Error("Mật khẩu cũ không đúng");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update
    await query("UPDATE sys_user SET password_hash = $1 WHERE id = $2", [
      hashedPassword,
      id,
    ]);

    return true;
  }

  // Update last login
  static async updateLastLogin(id) {
    await query(
      "UPDATE sys_user SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id],
    );
  }

  // Vô hiệu hóa user
  static async deactivate(id) {
    const result = await query(
      "UPDATE sys_user SET status = FALSE WHERE id = $1 RETURNING *",
      [id],
    );
    return result.rows[0];
  }

  // Kích hoạt user
  static async activate(id) {
    const result = await query(
      "UPDATE sys_user SET status = TRUE WHERE id = $1 RETURNING *",
      [id],
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
      [user_id],
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
      quyen_chuyen_kho = false,
    } = permissions;

    const result = await query(
      `INSERT INTO sys_user_kho (
        user_id, ma_kho, quyen_xem, quyen_them, quyen_sua, quyen_xoa, quyen_chuyen_kho
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, ma_kho) 
      DO UPDATE SET
        quyen_xem = $3, quyen_them = $4, quyen_sua = $5, quyen_xoa = $6, quyen_chuyen_kho = $7
      RETURNING *`,
      [
        user_id,
        ma_kho,
        quyen_xem,
        quyen_them,
        quyen_sua,
        quyen_xoa,
        quyen_chuyen_kho,
      ],
    );

    return result.rows[0];
  }

  // Xóa quyền kho
  static async removeWarehouse(user_id, ma_kho) {
    await query("DELETE FROM sys_user_kho WHERE user_id = $1 AND ma_kho = $2", [
      user_id,
      ma_kho,
    ]);
    return true;
  }
}

module.exports = User;
