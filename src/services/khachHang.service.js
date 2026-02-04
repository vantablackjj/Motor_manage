const { query } = require("../config/database");

class KhachHangService {
  /* ======================
   * Lấy danh sách khách hàng
   * ====================== */
  static async getAll({ status, la_ncc } = {}) {
    let sql = `SELECT *, ma_doi_tac as ma_kh, ten_doi_tac as ho_ten FROM dm_doi_tac WHERE 1=1`;
    const params = [];

    if (typeof status === "boolean") {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (typeof la_ncc === "boolean") {
      if (la_ncc) {
        sql += ` AND loai_doi_tac IN ('NHA_CUNG_CAP', 'CA_HAI')`;
      } else {
        sql += ` AND loai_doi_tac IN ('KHACH_HANG', 'CA_HAI')`;
      }
    }

    sql += ` ORDER BY ten_doi_tac`;

    const result = await query(sql, params);
    return result.rows;
  }

  /* ======================
   * Lấy theo Mã KH (ma_kh)
   * ====================== */
  static async getById(maKh) {
    const result = await query(
      `SELECT *, ma_doi_tac as ma_kh, ten_doi_tac as ho_ten FROM dm_doi_tac WHERE ma_doi_tac = $1`,
      [maKh],
    );
    return result.rows[0];
  }

  /* ======================
   * Tạo mới khách hàng
   * ====================== */
  static async create(data) {
    const { generateCode } = require("../ultils/codeGenerator");
    const loai_doi_tac =
      data.loai_doi_tac || (data.la_ncc ? "NHA_CUNG_CAP" : "KHACH_HANG");
    const prefix = loai_doi_tac === "NHA_CUNG_CAP" ? "NCC" : "KH";

    // Check trùng mã replaced by auto-gen
    const ma_kh = await generateCode("dm_doi_tac", "ma_doi_tac", prefix);

    const result = await query(
      `
      INSERT INTO dm_doi_tac (
        ma_doi_tac,
        ten_doi_tac,
        dai_dien,
        ngay_sinh,
        ma_so_thue,
        so_cmnd,
        dia_chi,
        dien_thoai,
        email,
        ho_khau,
        loai_doi_tac,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING *, ma_doi_tac as ma_kh, ten_doi_tac as ho_ten
      `,
      [
        ma_kh,
        data.ho_ten,
        data.dai_dien || null,
        data.ngay_sinh || null,
        data.ma_so_thue || null,
        data.so_cmnd || null,
        data.dia_chi || null,
        data.dien_thoai || null,
        data.email || null,
        data.ho_khau || null,
        data.loai_doi_tac || (data.la_ncc ? "NHA_CUNG_CAP" : "KHACH_HANG"),
        data.status ?? true,
      ],
    );

    return result.rows[0];
  }

  /* ======================
   * Cập nhật khách hàng
   * ====================== */
  static async update(maKh, data) {
    const current = await this.getById(maKh);
    if (!current) {
      throw new Error("Khách hàng không tồn tại");
    }

    const result = await query(
      `
      UPDATE dm_doi_tac
      SET
        ten_doi_tac = $1,
        dai_dien  = $2,
        dia_chi   = $3,
        dien_thoai= $4,
        email     = $5,
        ho_khau   = $6,
        loai_doi_tac = $7,
        status    = $8
      WHERE ma_doi_tac = $9
      RETURNING *, ma_doi_tac as ma_kh, ten_doi_tac as ho_ten
      `,
      [
        data.ho_ten || current.ho_ten,
        data.dai_dien || current.dai_dien,
        data.dia_chi || current.dia_chi,
        data.dien_thoai || current.dien_thoai,
        data.email || current.email,
        data.ho_khau || current.ho_khau,
        data.loai_doi_tac !== undefined
          ? data.loai_doi_tac
          : data.la_ncc !== undefined
            ? data.la_ncc
              ? "NHA_CUNG_CAP"
              : "KHACH_HANG"
            : current.loai_doi_tac,
        data.status !== undefined ? data.status : current.status,
        maKh,
      ],
    );

    return result.rows[0];
  }

  /* ======================
   * Xóa (soft delete)
   * ====================== */
  static async delete(maKh) {
    const result = await query(
      `UPDATE dm_doi_tac SET status = false WHERE ma_doi_tac = $1 RETURNING *`,
      [maKh],
    );
    return result.rows[0];
  }
}

module.exports = KhachHangService;
