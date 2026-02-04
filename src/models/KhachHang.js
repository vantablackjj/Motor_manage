const { query } = require("../config/database");

class KhachHang {
  // Lấy tất cả khách hàng/đối tác
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        id, ma_doi_tac as ma_kh, ten_doi_tac as ho_ten, dai_dien, ngay_sinh, ma_so_thue,
        so_cmnd, dia_chi, dien_thoai, email, loai_doi_tac, created_at
      FROM dm_doi_tac
      WHERE status = TRUE
    `;

    const params = [];

    if (filters.la_ncc !== undefined) {
      params.push(filters.la_ncc ? "NHA_CUNG_CAP" : "KHACH_HANG");
      sql += ` AND loai_doi_tac = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (ten_doi_tac ILIKE $${params.length} OR ma_doi_tac ILIKE $${params.length} OR dien_thoai ILIKE $${params.length})`;
    }

    sql += " ORDER BY ten_doi_tac ASC";

    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy khách hàng theo mã
  static async getByMaKH(ma_kh) {
    const result = await query(
      `SELECT *, ma_doi_tac as ma_kh, ten_doi_tac as ho_ten FROM dm_doi_tac WHERE ma_doi_tac = $1 AND status = TRUE`,
      [ma_kh],
    );
    return result.rows[0];
  }

  // Tạo khách hàng mới
  static async create(data) {
    const {
      ma_kh,
      ho_ten,
      dai_dien,
      ngay_sinh,
      ma_so_thue,
      so_cmnd,
      dia_chi,
      dien_thoai,
      ho_khau,
      email,
      tai_khoan,
      ngan_hang,
      ghi_chu,
      la_ncc,
    } = data;

    const result = await query(
      `INSERT INTO dm_doi_tac (
        ma_doi_tac, ten_doi_tac, dai_dien, ngay_sinh, ma_so_thue, so_cmnd,
        dia_chi, dien_thoai, ho_khau, email,
        tai_khoan, ngan_hang, ghi_chu, loai_doi_tac
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *, ma_doi_tac as ma_kh, ten_doi_tac as ho_ten`,
      [
        ma_kh,
        ho_ten,
        dai_dien,
        ngay_sinh,
        ma_so_thue,
        so_cmnd,
        dia_chi,
        dien_thoai,
        ho_khau,
        email,
        tai_khoan,
        ngan_hang,
        ghi_chu,
        la_ncc ? "NHA_CUNG_CAP" : "KHACH_HANG",
      ],
    );

    return result.rows[0];
  }

  // Cập nhật khách hàng
  static async update(ma_kh, data) {
    const {
      ho_ten,
      dai_dien,
      ngay_sinh,
      ma_so_thue,
      so_cmnd,
      dia_chi,
      dien_thoai,
      ho_khau,
      email,
      tai_khoan,
      ngan_hang,
      ghi_chu,
      la_ncc,
    } = data;

    const result = await query(
      `UPDATE dm_doi_tac
       SET ten_doi_tac = $1, dai_dien = $2, ngay_sinh = $3, ma_so_thue = $4,
           so_cmnd = $5, dia_chi = $6, dien_thoai = $7,
           ho_khau = $8, email = $9, tai_khoan = $10, ngan_hang = $11,
           ghi_chu = $12, loai_doi_tac = $13
       WHERE ma_doi_tac = $14 AND status = TRUE
       RETURNING *, ma_doi_tac as ma_kh, ten_doi_tac as ho_ten`,
      [
        ho_ten,
        dai_dien,
        ngay_sinh,
        ma_so_thue,
        so_cmnd,
        dia_chi,
        dien_thoai,
        ho_khau,
        email,
        tai_khoan,
        ngan_hang,
        ghi_chu,
        la_ncc ? "NHA_CUNG_CAP" : "KHACH_HANG",
        ma_kh,
      ],
    );

    return result.rows[0];
  }

  // Xóa mềm
  static async softDelete(ma_kh) {
    const result = await query(
      "UPDATE dm_doi_tac SET status = FALSE WHERE ma_doi_tac = $1 RETURNING *",
      [ma_kh],
    );
    return result.rows[0];
  }

  // Kiểm tra khách hàng có tồn tại không
  static async exists(ma_kh) {
    const result = await query(
      "SELECT EXISTS(SELECT 1 FROM dm_doi_tac WHERE ma_doi_tac = $1 AND status = TRUE)",
      [ma_kh],
    );
    return result.rows[0].exists;
  }
}

module.exports = KhachHang;
