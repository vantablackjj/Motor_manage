const { query, pool } = require("../config/database");

class Xe {
  // Lấy xe theo xe_key
  static async getByXeKey(xe_key) {
    const result = await query(
      `SELECT 
        x.ma_serial as xe_key, x.serial_identifier as so_khung, x.ma_hang_hoa as ma_loai_xe,
        x.ma_kho_hien_tai, x.trang_thai, x.locked, x.locked_reason,
        x.ngay_nhap_kho as ngay_nhap, x.ghi_chu,
        hh.ten_hang_hoa as ten_loai, m.ten_mau,
        k.ten_kho, (x.thuoc_tinh_rieng->>'so_may') as so_may
      FROM tm_hang_hoa_serial x
      INNER JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      LEFT JOIN dm_mau m ON (x.thuoc_tinh_rieng->>'ma_mau') = m.ma_mau
      WHERE x.ma_serial = $1`,
      [xe_key],
    );
    return result.rows[0];
  }

  // Lấy tồn kho xe theo kho
  static async getTonKho(ma_kho, filters = {}) {
    let sql = `
      SELECT 
        x.ma_serial as xe_key, x.ma_hang_hoa as ma_loai_xe, x.serial_identifier as so_khung,
        x.trang_thai, x.locked, x.ngay_nhap_kho as ngay_nhap,
        hh.ten_hang_hoa as ten_loai, m.ten_mau,
        x.gia_von as gia_nhap, (x.thuoc_tinh_rieng->>'so_may') as so_may
      FROM tm_hang_hoa_serial x
      INNER JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN dm_mau m ON (x.thuoc_tinh_rieng->>'ma_mau') = m.ma_mau
      WHERE x.ma_kho_hien_tai = $1 
        AND x.trang_thai = 'TON_KHO'
    `;

    const params = [ma_kho];

    if (filters.ma_loai_xe) {
      params.push(filters.ma_loai_xe);
      sql += ` AND x.ma_hang_hoa = $${params.length}`;
    }

    if (filters.ma_mau) {
      params.push(filters.ma_mau);
      sql += ` AND (x.thuoc_tinh_rieng->>'ma_mau') = $${params.length}`;
    }

    if (filters.locked === false) {
      sql += ` AND x.locked = FALSE`;
    }

    sql += " ORDER BY hh.ten_hang_hoa, x.ngay_nhap_kho DESC";

    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy lịch sử xe
  static async getLichSu(xe_key) {
    const result = await query(
      `SELECT 
        ls.*, 
        kx.ten_kho as ten_kho_xuat,
        kn.ten_kho as ten_kho_nhap
      FROM tm_hang_hoa_lich_su ls
      LEFT JOIN sys_kho kx ON ls.ma_kho_xuat = kx.ma_kho
      LEFT JOIN sys_kho kn ON ls.ma_kho_nhap = kn.ma_kho
      WHERE ls.ma_serial = $1
      ORDER BY ls.ngay_giao_dich DESC`,
      [xe_key],
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
        `SELECT 1 FROM tm_hang_hoa_serial
         WHERE ma_serial = $1 OR serial_identifier = $2 OR (thuoc_tinh_rieng->>'so_may') = $3`,
        [xe_key, so_khung, so_may],
      );

      if (exists.rows.length > 0) {
        throw new Error("Xe đã tồn tại (trùng mã, số khung hoặc số máy)");
      }

      const xeResult = await client.query(
        `INSERT INTO tm_hang_hoa_serial (
            ma_serial, ma_hang_hoa, serial_identifier,
            ma_kho_hien_tai, ngay_nhap_kho, trang_thai, ghi_chu,
            thuoc_tinh_rieng
          ) VALUES ($1, $2, $3, $4, $5, 'TON_KHO', $6, $7)
          RETURNING *`,
        [
          xe_key,
          ma_loai_xe,
          so_khung,
          ma_kho_hien_tai,
          ngay_nhap || "NOW()",
          ghi_chu,
          JSON.stringify({ ma_mau, so_may, created_by: nguoi_tao }),
        ],
      );

      // Ghi lịch sử
      await client.query(
        `INSERT INTO tm_hang_hoa_lich_su (
          ma_hang_hoa, ma_serial, loai_giao_dich, so_chung_tu, ngay_giao_dich,
          ma_kho_nhap, don_gia, nguoi_thuc_hien, dien_giai
        ) VALUES ($1, $2, 'NHAP_KHO', $3, CURRENT_TIMESTAMP, $4, $5, $6, $7)`,
        [
          ma_loai_xe,
          xe_key,
          "NK-" + xe_key,
          ma_kho_hien_tai,
          gia_nhap,
          nguoi_tao,
          "Nhập xe từ nhà cung cấp",
        ],
      );

      await client.query("COMMIT");
      return {
        ...xeResult.rows[0],
        xe_key: xeResult.rows[0].ma_serial,
      };
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
      `UPDATE tm_hang_hoa_serial
       SET locked = TRUE, locked_reason = $1, updated_at = CURRENT_TIMESTAMP
       WHERE ma_serial = $2 AND locked = FALSE AND trang_thai = 'TON_KHO'
       RETURNING *`,
      [ly_do, xe_key],
    );

    if (result.rows.length === 0) {
      throw new Error("Xe không thể khóa (đã bị khóa hoặc không tồn kho)");
    }

    return result.rows[0];
  }

  // Bỏ khóa xe
  static async unlock(xe_key) {
    const result = await query(
      `UPDATE tm_hang_hoa_serial
       SET locked = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE ma_serial = $1
       RETURNING *`,
      [xe_key],
    );
    return result.rows[0];
  }

  // Kiểm tra xe có khả dụng không
  static async checkAvailable(xe_key, ma_kho) {
    const result = await query(
      `SELECT ma_serial as xe_key, locked, trang_thai, ma_kho_hien_tai
       FROM tm_hang_hoa_serial
       WHERE ma_serial = $1`,
      [xe_key],
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
      const xeRes = await client.query(
        `SELECT ma_serial, locked, trang_thai, thuoc_tinh_rieng
         FROM tm_hang_hoa_serial
         WHERE ma_serial = $1`,
        [xe_key],
      );

      if (!xeRes.rows.length) {
        throw new Error("Xe không tồn tại");
      }

      if (xeRes.rows[0].locked) {
        throw new Error("Xe đang bị khóa");
      }

      if (xeRes.rows[0].trang_thai !== "TON_KHO") {
        throw new Error("Chỉ được sửa xe tồn kho");
      }

      // Handle properties
      const currentProps = xeRes.rows[0].thuoc_tinh_rieng || {};
      const newProps = { ...currentProps };

      const coreData = {};
      if (data.so_khung) coreData.serial_identifier = data.so_khung;
      if (data.ma_kho_hien_tai) coreData.ma_kho_hien_tai = data.ma_kho_hien_tai;

      if (data.ma_mau) newProps.ma_mau = data.ma_mau;
      if (data.so_may) newProps.so_may = data.so_may;

      coreData.thuoc_tinh_rieng = JSON.stringify({
        ...newProps,
        updated_by: nguoi_sua,
      });
      coreData.updated_at = "NOW()";

      // 2. Update
      const fields = [];
      const values = [];
      let idx = 1;

      for (const key in coreData) {
        fields.push(`${key} = $${idx++}`);
        values.push(coreData[key]);
      }

      values.push(xe_key);

      const result = await client.query(
        `UPDATE tm_hang_hoa_serial
         SET ${fields.join(", ")}
         WHERE ma_serial = $${idx}
         RETURNING *`,
        values,
      );

      // 3. Ghi lịch sử
      await client.query(
        `INSERT INTO tm_hang_hoa_lich_su (
          ma_hang_hoa, ma_serial, loai_giao_dich, ngay_giao_dich,
          nguoi_thuc_hien, dien_giai
        ) VALUES ($1, $2, 'CAP_NHAT', CURRENT_TIMESTAMP, $3, $4)`,
        [
          result.rows[0].ma_hang_hoa,
          xe_key,
          nguoi_sua,
          "Cập nhật thông tin xe",
        ],
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
      SELECT serial_identifier as so_khung, (thuoc_tinh_rieng->>'so_may') as so_may, ma_serial
      FROM tm_hang_hoa_serial
      WHERE (serial_identifier = $1 OR (thuoc_tinh_rieng->>'so_may') = $2)
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
          message: `Số khung đã tồn tại (${row.ma_serial})`,
        });
      }
      if (row.so_may === soMay) {
        errors.push({
          field: "so_may",
          message: `Số máy đã tồn tại (${row.ma_serial})`,
        });
      }
    }

    return errors;
  }

  // Lấy dữ liệu xe cho export
  static async getAllForExport(filters = {}) {
    let sql = `
      SELECT 
        x.ma_serial as xe_key, x.ma_hang_hoa as ma_loai_xe, x.serial_identifier as so_khung,
        (x.thuoc_tinh_rieng->>'so_may') as so_may, m.ten_mau,
        hh.ten_hang_hoa as ten_loai, k.ten_kho, x.trang_thai, x.ngay_nhap_kho as ngay_nhap
      FROM tm_hang_hoa_serial x
      INNER JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      LEFT JOIN dm_mau m ON (x.thuoc_tinh_rieng->>'ma_mau') = m.ma_mau
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (filters.ma_kho) {
      sql += ` AND x.ma_kho_hien_tai = $${idx++}`;
      params.push(filters.ma_kho);
    }
    if (filters.ma_loai_xe) {
      sql += ` AND x.ma_hang_hoa = $${idx++}`;
      params.push(filters.ma_loai_xe);
    }
    if (filters.trang_thai) {
      sql += ` AND x.trang_thai = $${idx++}`;
      params.push(filters.trang_thai);
    }

    sql += " ORDER BY x.ngay_nhap_kho DESC";
    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy danh sách xe chờ duyệt
  static async getApprovalList(filters = {}) {
    let sql = `
      SELECT 
        x.ma_serial as xe_key, x.serial_identifier as so_khung, x.ma_hang_hoa as ma_loai_xe,
        (x.thuoc_tinh_rieng->>'so_may') as so_may, m.ten_mau,
        hh.ten_hang_hoa as ten_loai, k.ten_kho, x.trang_thai, x.ngay_nhap_kho as ngay_nhap,
        x.ngay_gui_duyet, u_gui.ho_ten as ten_nguoi_gui,
        x.ngay_duyet, u_duyet.ho_ten as ten_nguoi_duyet,
        x.ly_do_tu_choi
      FROM tm_hang_hoa_serial x
      INNER JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      LEFT JOIN dm_mau m ON (x.thuoc_tinh_rieng->>'ma_mau') = m.ma_mau
      LEFT JOIN sys_user u_gui ON x.nguoi_gui_duyet = u_gui.id
      LEFT JOIN sys_user u_duyet ON x.nguoi_duyet = u_duyet.id
      WHERE x.trang_thai IN ('NHAP', 'CHO_DUYET', 'DA_TU_CHOI')
    `;
    const params = [];
    let idx = 1;

    if (filters.trang_thai) {
      sql += ` AND x.trang_thai = $${idx++}`;
      params.push(filters.trang_thai);
    }

    sql += " ORDER BY x.created_at DESC";
    const result = await query(sql, params);
    return result.rows;
  }
}

module.exports = Xe;
