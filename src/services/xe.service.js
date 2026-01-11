const { query, pool } = require("../config/database");

class Xe {
  // Lấy xe theo xe_key
  static async getByXeKey(xe_key) {
    const result = await query(
      `SELECT 
        x.*, xl.ten_loai, m.ten_mau, k.ten_kho,
        kh.ho_ten as ten_khach_hang
      FROM tm_xe_thuc_te x
      INNER JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
      LEFT JOIN sys_mau m ON x.ma_mau = m.ma_mau
      LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      LEFT JOIN tm_khach_hang kh ON x.ma_kh = kh.ma_kh
      WHERE x.xe_key = $1`,
      [xe_key]
    );
    return result.rows[0];
  }

  // Lấy tồn kho xe theo kho
  static async getTonKho(ma_kho, filters = {}) {
    let sql = `
      SELECT 
        x.xe_key, x.ma_loai_xe, x.ma_mau, x.so_khung, x.so_may,
        x.bien_so, x.gia_nhap, x.trang_thai, x.locked, x.locked_by,
        x.ngay_nhap, xl.ten_loai, m.ten_mau
      FROM tm_xe_thuc_te x
      INNER JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
      LEFT JOIN sys_mau m ON x.ma_mau = m.ma_mau
      WHERE x.ma_kho_hien_tai = $1 
        AND x.trang_thai = 'TON_KHO'
        AND x.status = TRUE
    `;

    const params = [ma_kho];

    if (filters.ma_loai_xe) {
      params.push(filters.ma_loai_xe);
      sql += ` AND x.ma_loai_xe = $${params.length}`;
    }

    if (filters.ma_mau) {
      params.push(filters.ma_mau);
      sql += ` AND x.ma_mau = $${params.length}`;
    }

    if (filters.locked === false) {
      sql += ` AND x.locked = FALSE`;
    }

    sql += " ORDER BY xl.ten_loai, m.ten_mau, x.ngay_nhap DESC";

    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy lịch sử xe
  static async getLichSu(xe_key) {
    const result = await query(
      `SELECT 
        ls.*, 
        kho_xuat.ten_kho as ten_kho_xuat,
        kho_nhap.ten_kho as ten_kho_nhap
      FROM tm_xe_lich_su ls
      LEFT JOIN sys_kho kho_xuat ON ls.ma_kho_xuat = kho_xuat.ma_kho
      LEFT JOIN sys_kho kho_nhap ON ls.ma_kho_nhap = kho_nhap.ma_kho
      WHERE ls.xe_key = $1
      ORDER BY ls.ngay_giao_dich DESC`,
      [xe_key]
    );
    return result.rows;
  }

  // Tạo xe mới
  static async create(data) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        xe_key,
        ma_loai_xe,
        ma_mau,
        so_khung,
        so_may,
        ma_kho_hien_tai,
        ngay_nhap,
        gia_nhap,
        ghi_chu,
        nguoi_tao,
      } = data;

      const exists = await client.query(
        `SELECT 1 FROM tm_xe_thuc_te
   WHERE xe_key = $1 OR so_khung = $2 OR so_may = $3`,
        [xe_key, so_khung, so_may]
      );

      if (exists.rows.length > 0) {
        throw new Error("Xe đã tồn tại (trùng mã, số khung hoặc số máy)");
      }

      // Insert xe
      const xeResult = await client.query(
        `INSERT INTO tm_xe_thuc_te (
          xe_key, ma_loai_xe, ma_mau, so_khung, so_may,
          ma_kho_hien_tai, ngay_nhap, gia_nhap, trang_thai, ghi_chu
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          xe_key,
          ma_loai_xe,
          ma_mau,
          so_khung,
          so_may,
          ma_kho_hien_tai,
          ngay_nhap,
          gia_nhap,
          "TON_KHO",
          ghi_chu,
        ]
      );

      // Ghi lịch sử
      await client.query(
        `INSERT INTO tm_xe_lich_su (
          xe_key, loai_giao_dich, so_chung_tu, ngay_giao_dich,
          ma_kho_nhap, gia_tri, nguoi_thuc_hien, dien_giai
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7)`,
        [
          xe_key,
          "NHAP_KHO",
          "NK-" + xe_key,
          ma_kho_hien_tai,
          gia_nhap,
          nguoi_tao,
          "Nhập xe từ nhà cung cấp",
        ]
      );

      await client.query("COMMIT");
      return xeResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Khóa xe
  static async lock(xe_key, ma_phieu, ly_do) {
    const result = await query(
      `UPDATE tm_xe_thuc_te
       SET locked = TRUE, locked_by = $1, locked_at = CURRENT_TIMESTAMP,
           locked_reason = $2
       WHERE xe_key = $3 AND locked = FALSE AND trang_thai = 'TON_KHO'
       RETURNING *`,
      [ma_phieu, ly_do, xe_key]
    );

    if (result.rows.length === 0) {
      throw new Error("Xe không thể khóa (đã bị khóa hoặc không tồn kho)");
    }

    return result.rows[0];
  }

  // Bỏ khóa xe
  static async unlock(xe_key) {
    const result = await query(
      `UPDATE tm_xe_thuc_te
       SET locked = FALSE, locked_by = NULL, locked_at = NULL, locked_reason = NULL
       WHERE xe_key = $1
       RETURNING *`,
      [xe_key]
    );
    return result.rows[0];
  }

  // Bỏ khóa theo số phiếu
  static async unlockByPhieu(ma_phieu) {
    const result = await query(
      `UPDATE tm_xe_thuc_te
       SET locked = FALSE, locked_by = NULL, locked_at = NULL, locked_reason = NULL
       WHERE locked_by = $1
       RETURNING xe_key`,
      [ma_phieu]
    );
    return result.rows;
  }

  // Kiểm tra xe có khả dụng không
  static async checkAvailable(xe_key, ma_kho) {
    const result = await query(
      `SELECT xe_key, locked, trang_thai, ma_kho_hien_tai
       FROM tm_xe_thuc_te
       WHERE xe_key = $1 AND status = TRUE`,
      [xe_key]
    );

    if (result.rows.length === 0) {
      throw new Error("Xe không tồn tại");
    }

    const xe = result.rows[0];

    if (xe.locked) {
      throw new Error("Xe đang bị khóa");
    }

    if (xe.trang_thai !== "TON_KHO") {
      throw new Error(`Xe không ở trạng thái tồn kho (${xe.trang_thai})`);
    }

    if (xe.ma_kho_hien_tai !== ma_kho) {
      throw new Error(`Xe không có tại kho ${ma_kho}`);
    }

    return true;
  }
  static async update(xe_key, data, nguoi_sua) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Check xe
      const xe = await client.query(
        `SELECT xe_key, locked, trang_thai
       FROM tm_xe_thuc_te
       WHERE xe_key = $1 AND status = TRUE`,
        [xe_key]
      );

      if (!xe.rows.length) {
        throw new Error("Xe không tồn tại");
      }

      if (xe.rows[0].locked) {
        throw new Error("Xe đang bị khóa");
      }

      if (xe.rows[0].trang_thai !== "TON_KHO") {
        throw new Error("Chỉ được sửa xe tồn kho");
      }

      // 2. Update
      const fields = [];
      const values = [];
      let idx = 1;

      for (const key in data) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }

      values.push(xe_key);

      const result = await client.query(
        `UPDATE tm_xe_thuc_te
       SET ${fields.join(", ")}, ngay_cap_nhat = CURRENT_TIMESTAMP
       WHERE xe_key = $${idx}
       RETURNING *`,
        values
      );

      // 3. Ghi lịch sử
      await client.query(
        `INSERT INTO tm_xe_lich_su (
        xe_key, loai_giao_dich, ngay_giao_dich,
        nguoi_thuc_hien, dien_giai
      ) VALUES ($1, 'CAP_NHAT', CURRENT_TIMESTAMP, $2, $3)`,
        [xe_key, nguoi_sua, "Cập nhật thông tin xe"]
      );

      await client.query("COMMIT");
      return result.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Kiểm tra trùng số khung / số máy
  static async checkDuplicate(soKhung, soMay, excludeId = null) {
    const params = [soKhung, soMay];
    let sql = `
      SELECT so_khung, so_may, xe_key
      FROM tm_xe_thuc_te
      WHERE status = true
        AND (so_khung = $1 OR so_may = $2)
    `;

    if (excludeId) {
      sql += ` AND id != $3`;
      params.push(excludeId);
    }

    const result = await pool.query(sql, params);
    const errors = [];

    for (const row of result.rows) {
      if (row.so_khung === soKhung) {
        errors.push({
          field: "so_khung",
          message: `Số khung đã tồn tại (${row.xe_key})`,
        });
      }
      if (row.so_may === soMay) {
        errors.push({
          field: "so_may",
          message: `Số máy đã tồn tại (${row.xe_key})`,
        });
      }
    }

    return errors;
  }
  // Lấy dữ liệu xe cho export
  static async getAllForExport(filters = {}) {
    let sql = `
      SELECT 
        x.*, xl.ten_loai, m.ten_mau, k.ten_kho
      FROM tm_xe_thuc_te x
      INNER JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
      LEFT JOIN sys_mau m ON x.ma_mau = m.ma_mau
      LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.status = TRUE
    `;
    const params = [];
    let idx = 1;

    if (filters.ma_kho) {
      sql += ` AND x.ma_kho_hien_tai = $${idx++}`;
      params.push(filters.ma_kho);
    }
    if (filters.ma_loai_xe) {
      sql += ` AND x.ma_loai_xe = $${idx++}`;
      params.push(filters.ma_loai_xe);
    }
    if (filters.trang_thai) {
      sql += ` AND x.trang_thai = $${idx++}`;
      params.push(filters.trang_thai);
    }

    sql += " ORDER BY x.ngay_nhap DESC";
    const result = await query(sql, params);
    return result.rows;
  }
}

module.exports = Xe;
