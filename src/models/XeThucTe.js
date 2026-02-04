const { query, pool } = require("../config/database");

class Xe {
  // Lấy xe theo xe_key
  static async getByXeKey(xe_key) {
    const result = await query(
      `SELECT 
        x.ma_serial as xe_key, x.serial_identifier as so_khung, x.ma_hang_hoa as ma_loai_xe,
        x.ma_kho_hien_tai, x.trang_thai, x.locked, x.locked_reason,
        x.ngay_nhap_kho as ngay_nhap, x.ghi_chu,
        hh.ten_hang_hoa as ten_loai, (x.thuoc_tinh_rieng->>'ten_mau') as ten_mau,
        k.ten_kho
      FROM tm_hang_hoa_serial x
      INNER JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
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
        hh.ten_hang_hoa as ten_loai, (x.thuoc_tinh_rieng->>'ten_mau') as ten_mau,
        hh.gia_von_mac_dinh as gia_nhap
      FROM tm_hang_hoa_serial x
      INNER JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
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

  // Khóa xe
  static async lock(xe_key, ma_phieu, ly_do) {
    const result = await query(
      `UPDATE tm_hang_hoa_serial
       SET locked = TRUE, ghi_chu = COALESCE(ghi_chu, '') || E'\nLocked by ' || $1 || ': ' || $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE ma_serial = $3 AND locked = FALSE AND trang_thai = 'TON_KHO'
       RETURNING *`,
      [ma_phieu, ly_do, xe_key],
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
}

module.exports = Xe;
