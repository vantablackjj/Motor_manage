const { query } = require("../config/database");

class KhachHangService {
  /* ======================
   * Lấy danh sách khách hàng
   * ====================== */
  static async getAll({ status } = {}) {
    let sql = `SELECT * FROM tm_khach_hang WHERE 1=1`;
    const params = [];

    if (typeof status === "boolean") {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY ho_ten`;

    const result = await query(sql, params);
    return result.rows;
  }

  /* ======================
   * Lấy theo ID
   * ====================== */
  static async getById(id) {
    const result = await query(`SELECT * FROM tm_khach_hang WHERE id = $1`, [
      id,
    ]);
    return result.rows[0];
  }

  /* ======================
   * Tạo mới khách hàng
   * ====================== */
  static async create(data) {
    // Check trùng mã
    const exists = await query(`SELECT 1 FROM tm_khach_hang WHERE ma_kh = $1`, [
      data.ma_kh,
    ]);

    if (exists.rowCount > 0) {
      throw new Error("Mã khách hàng đã tồn tại");
    }

    // Nếu set mặc định → reset các KH khác
    if (data.status === true) {
      await query(`UPDATE tm_khach_hang SET status = false`);
    }

    const result = await query(
      `
      INSERT INTO tm_khach_hang (
        ma_kh,
        ho_ten,
        dai_dien,
        ngay_sinh,
        ma_so_thue,
        so_cmnd,
        dia_chi,
        dien_thoai,
        email,
        ho_khau,
        la_ncc,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING *
      `,
      [
        data.ma_kh,
        data.ho_ten,
        data.dai_dien || null,
        data.ngay_sinh || null,
        data.ma_so_thue || null,
        data.so_cmnd || null,
        data.dia_chi || null,
        data.dien_thoai || null,
        data.email || null,
        data.ho_khau || null,
        data.la_ncc ?? false,
        data.status ?? true,
      ]
    );

    return result.rows[0];
  }

  /* ======================
   * Cập nhật khách hàng
   * ====================== */
  static async update(id, data) {
    const current = await this.getById(id);
    if (!current) {
      throw new Error("Khách hàng không tồn tại");
    }

    // Nếu set mặc định → reset các KH khác
    if (data.status === true) {
      await query(`UPDATE tm_khach_hang SET status = false WHERE id <> $1`, [
        id,
      ]);
    }

    const result = await query(
      `
      UPDATE tm_khach_hang
      SET
        ho_ten     = $1,
        dai_dien  = $2,
        dia_chi   = $3,
        dien_thoai= $4,
        email     = $5,
        ho_khau   = $6,
        la_ncc    = $7,
        status    = $8
      WHERE id = $9
      RETURNING *
      `,
      [
        data.ho_ten,
        data.dai_dien || null,
        data.dia_chi || null,
        data.dien_thoai || null,
        data.email || null,
        data.ho_khau || null,
        data.la_ncc ?? current.la_ncc,
        data.status ?? current.status,
        id,
      ]
    );

    return result.rows[0];
  }

  /* ======================
   * Xóa (hard delete)
   * ====================== */
  static async delete(id) {
    const result = await query(
      `DELETE FROM tm_khach_hang WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = KhachHangService;
