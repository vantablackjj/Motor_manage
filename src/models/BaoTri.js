const { query, transaction } = require("../config/database");

class BaoTri {
  // Tạo phiếu bảo trì
  static async create(data) {
    return await transaction(async (client) => {
      const {
        ma_phieu,
        ma_serial,
        ma_doi_tac,
        so_km_hien_tai,
        nguoi_lap_phieu,
        tong_tien,
        ghi_chu,
        loai_bao_tri,
        ly_do_mien_phi,
        ma_kho,
        chi_tiet, // Array of { ma_hang_hoa, ten_hang_muc, loai_hang_muc, so_luong, don_gia, thanh_tien, ghi_chu }
      } = data;

      // 1. Insert phiếu bảo trì
      const resPhieu = await client.query(
        `INSERT INTO tm_bao_tri (
          ma_phieu, ma_serial, ma_doi_tac, so_km_hien_tai, nguoi_lap_phieu, tong_tien, ghi_chu, loai_bao_tri, ly_do_mien_phi, ma_kho, trang_thai
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'CHO_DUYET')
        RETURNING *`,
        [
          ma_phieu,
          ma_serial,
          ma_doi_tac,
          so_km_hien_tai,
          nguoi_lap_phieu,
          tong_tien,
          ghi_chu,
          loai_bao_tri || "TINH_PHI",
          ly_do_mien_phi || null,
          ma_kho || null,
        ],
      );

      // 2. Insert chi tiết
      if (chi_tiet && chi_tiet.length > 0) {
        for (const item of chi_tiet) {
          await client.query(
            `INSERT INTO tm_bao_tri_chi_tiet (
              ma_phieu, ma_hang_hoa, ten_hang_muc, loai_hang_muc, so_luong, don_gia, thanh_tien, ghi_chu
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              ma_phieu,
              item.ma_hang_hoa,
              item.ten_hang_muc,
              item.loai_hang_muc,
              item.so_luong,
              item.don_gia,
              item.thanh_tien,
              item.ghi_chu,
            ],
          );
        }
      }

      // 3. Cập nhật số KM hiện tại cho xe
      await client.query(
        `UPDATE tm_hang_hoa_serial 
         SET so_km_hien_tai = $1, updated_at = CURRENT_TIMESTAMP
         WHERE ma_serial = $2`,
        [so_km_hien_tai, ma_serial],
      );

      return resPhieu.rows[0];
    });
  }

  // Lấy danh sách phiếu bảo trì
  static async getAll(filters = {}) {
    let sql = `
      SELECT b.*,
        x.serial_identifier as so_khung,
        x.la_xe_cua_hang,
        hh.ten_hang_hoa as ten_loai_xe,
        d.ten_doi_tac as ten_khach_hang,
        d.dien_thoai
      FROM tm_bao_tri b
      LEFT JOIN tm_hang_hoa_serial x ON b.ma_serial = x.ma_serial
      LEFT JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN dm_doi_tac d ON b.ma_doi_tac = d.ma_doi_tac
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (b.ma_phieu ILIKE $${params.length} OR b.ma_serial ILIKE $${params.length} OR d.ten_doi_tac ILIKE $${params.length})`;
    }

    if (filters.ma_serial) {
      params.push(filters.ma_serial);
      sql += ` AND b.ma_serial = $${params.length}`;
    }

    // Filter: chỉ xe cửa hàng hoặc chỉ xe ngoài
    if (filters.la_xe_cua_hang !== undefined) {
      params.push(
        filters.la_xe_cua_hang === "true" || filters.la_xe_cua_hang === true,
      );
      sql += ` AND x.la_xe_cua_hang = $${params.length}`;
    }

    sql += " ORDER BY b.ngay_bao_tri DESC";

    const res = await query(sql, params);
    return res.rows;
  }

  // Lấy chi tiết phiếu
  static async getById(ma_phieu) {
    const resPhieu = await query(
      `SELECT b.*,
        x.serial_identifier as so_khung,
        x.la_xe_cua_hang,
        x.bien_so,
        hh.ten_hang_hoa as ten_loai_xe,
        d.ten_doi_tac as ten_khach_hang, d.dien_thoai
       FROM tm_bao_tri b
       LEFT JOIN tm_hang_hoa_serial x ON b.ma_serial = x.ma_serial
       LEFT JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
       LEFT JOIN dm_doi_tac d ON b.ma_doi_tac = d.ma_doi_tac
       WHERE b.ma_phieu = $1`,
      [ma_phieu],
    );

    if (resPhieu.rows.length === 0) return null;

    const resChiTiet = await query(
      `SELECT * FROM tm_bao_tri_chi_tiet WHERE ma_phieu = $1`,
      [ma_phieu],
    );

    return {
      ...resPhieu.rows[0],
      chi_tiet: resChiTiet.rows,
    };
  }
}

module.exports = BaoTri;
