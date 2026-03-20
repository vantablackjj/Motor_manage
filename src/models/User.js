const { query } = require("../config/database");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
class User {
  // Lấy user theo username
  static async getByUsername(username) {
    const result = await query(
      `WITH user_roles AS (
          SELECT ur.user_id, r.id as role_id, r.ma_quyen as vai_tro, r.ten_quyen as ten_vai_tro, r.permissions
          FROM sys_user_role ur
          JOIN sys_role r ON ur.role_id = r.id
          WHERE ur.user_id = (SELECT id FROM sys_user WHERE username = $1)
       ),
       user_authorities AS (
          SELECT ra.role_id, a.ma_authority
          FROM sys_role_authority ra
          JOIN sys_authority a ON ra.authority_id = a.id
          WHERE ra.role_id IN (SELECT role_id FROM user_roles)
       )
       SELECT u.*, 
              (SELECT json_agg(json_build_object('id', role_id, 'ma_quyen', vai_tro, 'ten_quyen', ten_vai_tro)) FROM user_roles) as roles,
              (SELECT json_agg(DISTINCT ma_authority) FROM user_authorities) as authorities,
              -- Legacy fields for compatibility
              COALESCE((SELECT vai_tro FROM user_roles LIMIT 1), u.vai_tro) as vai_tro,
              COALESCE((SELECT ten_vai_tro FROM user_roles LIMIT 1), u.vai_tro) as ten_vai_tro,
              COALESCE((SELECT permissions FROM user_roles LIMIT 1), (SELECT permissions FROM sys_role WHERE id = u.role_id)) as permissions
       FROM sys_user u
       WHERE u.username = $1`,
      [username],
    );
    return result.rows[0];
  }

  // Lấy user theo ID
  static async getById(id) {
    const result = await query(
      `WITH user_roles AS (
          SELECT ur.user_id, r.id as role_id, r.ma_quyen as vai_tro, r.ten_quyen as ten_vai_tro, r.permissions
          FROM sys_user_role ur
          JOIN sys_role r ON ur.role_id = r.id
          WHERE ur.user_id = $1
       ),
       user_authorities AS (
          SELECT ra.role_id, a.ma_authority
          FROM sys_role_authority ra
          JOIN sys_authority a ON ra.authority_id = a.id
          WHERE ra.role_id IN (SELECT role_id FROM user_roles)
       )
       SELECT u.id, u.username, u.ho_ten, u.email, u.dien_thoai, u.ma_kho, u.role_id,
              (SELECT json_agg(json_build_object('id', role_id, 'ma_quyen', vai_tro, 'ten_quyen', ten_vai_tro)) FROM user_roles) as roles,
              (SELECT json_agg(DISTINCT ma_authority) FROM user_authorities) as authorities,
              -- Legacy fields
              COALESCE((SELECT vai_tro FROM user_roles LIMIT 1), u.vai_tro) as vai_tro,
              COALESCE((SELECT ten_vai_tro FROM user_roles LIMIT 1), u.vai_tro) as ten_vai_tro,
              COALESCE((SELECT permissions FROM user_roles LIMIT 1), (SELECT permissions FROM sys_role WHERE id = u.role_id)) as permissions,
              u.status, u.created_at, u.updated_at
       FROM sys_user u
       WHERE u.id = $1`,
      [id],
    );
    return result.rows[0];
  }

  // Lấy tất cả users
  static async getAll(filters = {}) {
    let sql = `
      WITH user_roles_agg AS (
        SELECT sur.user_id, 
               json_agg(json_build_object('id', sr.id, 'ma_quyen', sr.ma_quyen, 'ten_quyen', sr.ten_quyen)) as roles,
               array_agg(DISTINCT sr.ma_quyen) as role_codes
        FROM sys_user_role sur
        JOIN sys_role sr ON sur.role_id = sr.id
        GROUP BY sur.user_id
      ),
      user_authorities_agg AS (
        SELECT sur.user_id, 
               json_agg(DISTINCT sa.ma_authority) as authorities
        FROM sys_user_role sur
        JOIN sys_role_authority sra ON sur.role_id = sra.role_id
        JOIN sys_authority sa ON sra.authority_id = sa.id
        GROUP BY sur.user_id
      )
      SELECT u.id, u.username, u.ho_ten, u.email, u.dien_thoai, u.ma_kho,
             COALESCE(r.ma_quyen, u.vai_tro) as vai_tro,
             COALESCE(r.ten_quyen, u.vai_tro) as ten_vai_tro,
             u.role_id, u.status, u.created_at,
             ra.roles,
             aa.authorities
      FROM sys_user u
      LEFT JOIN sys_role r ON u.role_id = r.id
      LEFT JOIN user_roles_agg ra ON u.id = ra.user_id
      LEFT JOIN user_authorities_agg aa ON u.id = aa.user_id
      WHERE 1=1
    `;

    const params = [];

    if (filters.vai_tro) {
      params.push(filters.vai_tro.toUpperCase());
      sql += ` AND (r.ma_quyen = $${params.length} OR r.ten_quyen = $${params.length} OR u.vai_tro = $${params.length} OR $${params.length} = ANY(ra.role_codes))`;
    }

    if (filters.ma_kho) {
      params.push(filters.ma_kho);
      sql += ` AND u.ma_kho = $${params.length}`;
    }

    if (filters.status !== undefined) {
      params.push(filters.status);
      sql += ` AND u.status = $${params.length}`;
    }

    sql += " ORDER BY u.id ASC";

    const result = await query(sql, params);
    return result.rows;
  }

  // Tạo user mới
  static async create(data) {
    const {
      username,
      password,
      ho_ten,
      email,
      dien_thoai,
      vai_tro,
      role_id,
      ma_kho,
    } = data;

    let targetRoleId = role_id;

    // Nếu truyền vai_tro (string) thì tìm role_id theo ma_quyen hoặc ten_quyen
    if (vai_tro && !targetRoleId) {
      const roleRes = await query(
        "SELECT id FROM sys_role WHERE ma_quyen = $1 OR ten_quyen = $1",
        [vai_tro.toUpperCase()],
      );
      if (roleRes.rows.length > 0) {
        targetRoleId = roleRes.rows[0].id;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO sys_user (
        username, password_hash, ho_ten, email, dien_thoai, role_id, vai_tro, ma_kho
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, ho_ten, email, role_id, vai_tro, ma_kho, created_at`,
      [
        username,
        hashedPassword,
        ho_ten,
        email,
        dien_thoai,
        targetRoleId,
        vai_tro,
        ma_kho,
      ],
    );

    const user = result.rows[0];
    if (user) {
      // 4. Handle multiple roles in sys_user_role
      let roleIds = [];
      if (data.role_ids && Array.isArray(data.role_ids)) {
        roleIds = data.role_ids;
      } else if (targetRoleId) {
        roleIds = [targetRoleId];
      }

      if (roleIds.length > 0) {
        const insertRoleValues = roleIds.map((rid) => `(${user.id}, ${rid})`).join(",");
        await query(`INSERT INTO sys_user_role (user_id, role_id) VALUES ${insertRoleValues} ON CONFLICT DO NOTHING`);
      }
      
      user.vai_tro = vai_tro || null;
    }
    return user;
  }

  // Cập nhật user
  static async update(id, data) {
    // 1. Lấy thông tin hiện tại
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    // 2. Merge data (ưu tiên fields trong data, nếu undefined thì lấy từ existing)
    const ho_ten = data.ho_ten !== undefined ? data.ho_ten : existing.ho_ten;
    const email = data.email !== undefined ? data.email : existing.email;
    const dien_thoai =
      data.dien_thoai !== undefined ? data.dien_thoai : existing.dien_thoai;
    let role_id = data.role_id !== undefined ? data.role_id : existing.role_id;
    let vai_tro = data.vai_tro !== undefined ? data.vai_tro : existing.vai_tro;
    const ma_kho = data.ma_kho !== undefined ? data.ma_kho : existing.ma_kho;

    // 3. Nếu có cập nhật vai_tro bằng string, cần resolve role_id mới
    // 4. Execute Update
    const result = await query(
      `UPDATE sys_user
       SET ho_ten = $1, email = $2, dien_thoai = $3, role_id = $4, vai_tro = $5, ma_kho = $6
       WHERE id = $7
       RETURNING id, username, ho_ten, email, role_id, vai_tro, ma_kho`,
      [ho_ten, email, dien_thoai, role_id, vai_tro, ma_kho, id],
    );

    // 5. Sync multiple roles in sys_user_role if provided
    if (data.role_ids && Array.isArray(data.role_ids)) {
      // Clear existing
      await query("DELETE FROM sys_user_role WHERE user_id = $1", [id]);
      // Insert new
      if (data.role_ids.length > 0) {
        const insertRoleValues = data.role_ids.map((rid) => `(${id}, ${rid})`).join(",");
        await query(`INSERT INTO sys_user_role (user_id, role_id) VALUES ${insertRoleValues}`);
      }
    }

    const user = result.rows[0];
    if (user && vai_tro) {
      user.vai_tro = vai_tro;
    }
    return user;
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

  // Reset mật khẩu (dành cho Admin/Manager) - Không cần mật khẩu cũ
  static async resetPassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await query(
      "UPDATE sys_user SET password_hash = $1 WHERE id = $2 RETURNING id, username",
      [hashedPassword, id],
    );

    if (result.rows.length === 0) {
      throw new Error("User không tồn tại");
    }

    return result.rows[0];
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
      `UPDATE sys_user SET status = FALSE WHERE id = $1 
       RETURNING id, username, ho_ten, status, created_at`,
      [id],
    );
    return result.rows[0];
  }

  // Kích hoạt user
  static async activate(id) {
    const result = await query(
      `UPDATE sys_user SET status = TRUE WHERE id = $1 
       RETURNING id, username, ho_ten, status, created_at`,
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

  // Lấy tất cả các vai trò có trong hệ thống
  static async getAllRoles() {
    const result = await query(`
      SELECT r.id, r.ma_quyen, r.ten_quyen, r.permissions,
             (
               SELECT json_agg(sa.ma_authority)
               FROM sys_role_authority sra
               JOIN sys_authority sa ON sra.authority_id = sa.id
               WHERE sra.role_id = r.id
             ) as authorities
      FROM sys_role r 
      ORDER BY r.id ASC
    `);
    return result.rows;
  }

  /**
   * Đồng bộ quyền từ JSONB permissions sang bảng sys_authority và sys_role_authority (RBAC v2)
   * Dùng khi có thay đổi trong JSONB mà cần cập nhật sang hệ thống bảng granular
   */
  static async syncAuthorities() {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Chèn các authority mới từ JSONB permissions
      await client.query(`
        INSERT INTO sys_authority (ma_authority, ten_authority, nhom_authority)
        SELECT DISTINCT 
            key || '.' || sub_key as ma_authority,
            INITCAP(key) || ' ' || sub_key as ten_authority,
            key as nhom_authority
        FROM sys_role r
        CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(r.permissions) = 'object' THEN r.permissions ELSE '{}'::jsonb END) as p(key, val)
        CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(val) = 'object' THEN val ELSE '{}'::jsonb END) as s(sub_key, sub_val)
        WHERE (sub_val::text = 'true' OR sub_val::text = '1')
        ON CONFLICT (ma_authority) DO NOTHING
      `);

      // 2. Xóa các mapping cũ (để sync hoàn toàn)
      // Lưu ý: Trong môi trường production thực tế có thể cần logic merge thay vì delete all
      await client.query("DELETE FROM sys_role_authority");

      // 3. Tạo lại mapping Role -> Authority dựa trên JSONB hiện tại
      await client.query(`
        INSERT INTO sys_role_authority (role_id, authority_id)
        SELECT r.id, a.id
        FROM sys_role r
        CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(r.permissions) = 'object' THEN r.permissions ELSE '{}'::jsonb END) as p(key, val)
        CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(val) = 'object' THEN val ELSE '{}'::jsonb END) as s(sub_key, sub_val),
             sys_authority a
        WHERE (sub_val::text = 'true' OR sub_val::text = '1')
          AND a.ma_authority = key || '.' || sub_key
        ON CONFLICT DO NOTHING
      `);

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Lấy tất cả các quyền chi tiết có trong hệ thống
  static async getAllAuthorities() {
    const result = await query(
      "SELECT ma_authority, ten_authority, nhom_authority FROM sys_authority ORDER BY nhom_authority, ma_authority",
    );
    return result.rows;
  }

  // Cập nhật danh sách quyền chi tiết cho một vai trò
  static async updateRoleAuthorities(role_id, authorities) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // 1. Xóa hết mapping cũ của vai trò này
      await client.query("DELETE FROM sys_role_authority WHERE role_id = $1", [role_id]);
      
      // 2. Chèn mapping mới
      if (authorities && authorities.length > 0) {
        // Tìm IDs dựa trên ma_authority
        const authIdsRes = await client.query(
          "SELECT id FROM sys_authority WHERE ma_authority = ANY($1)",
          [authorities]
        );
        
        if (authIdsRes.rows.length > 0) {
          const values = authIdsRes.rows.map(row => `(${role_id}, ${row.id})`).join(",");
          await client.query(`INSERT INTO sys_role_authority (role_id, authority_id) VALUES ${values}`);
        }
      }
      
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = User;
