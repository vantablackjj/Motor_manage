/**
 * HangHoa Repository
 * Handles product catalog operations
 */

const BaseRepository = require("./BaseRepository");

class HangHoaRepository extends BaseRepository {
  constructor() {
    super("tm_hang_hoa");
  }

  /**
   * Find product by code
   */
  async findByMaHangHoa(maHangHoa, client = null) {
    return this.findByField("ma_hang_hoa", maHangHoa, client);
  }

  /**
   * Find products by group
   */
  async findByNhomHang(maNhomHang, client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} 
             WHERE ma_nhom_hang = $1 AND status = TRUE
             ORDER BY ten_hang_hoa`,
      [maNhomHang],
    );
    return result.rows;
  }

  /**
   * Find products by management type
   */
  async findByLoaiQuanLy(loaiQuanLy, client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} 
             WHERE loai_quan_ly = $1 AND status = TRUE
             ORDER BY ten_hang_hoa`,
      [loaiQuanLy],
    );
    return result.rows;
  }

  /**
   * Search products
   */
  async search(searchTerm, filters = {}, client = null) {
    const db = client || require("../config/database").pool;
    let sql = `
            SELECT h.*, n.ten_nhom
            FROM ${this.tableName} h
            LEFT JOIN dm_nhom_hang n ON h.ma_nhom_hang = n.ma_nhom
            WHERE h.status = TRUE
            AND (h.ten_hang_hoa ILIKE $1 OR h.ma_hang_hoa ILIKE $1)
        `;
    const params = [`%${searchTerm}%`];
    let paramIndex = 2;

    if (filters.ma_nhom_hang) {
      sql += ` AND h.ma_nhom_hang = $${paramIndex}`;
      params.push(filters.ma_nhom_hang);
      paramIndex++;
    }

    if (filters.loai_quan_ly) {
      sql += ` AND h.loai_quan_ly = $${paramIndex}`;
      params.push(filters.loai_quan_ly);
      paramIndex++;
    }

    sql += " ORDER BY h.ten_hang_hoa";

    const result = await db.query(sql, params);
    return result.rows;
  }

  /**
   * Get product with inventory summary
   */
  async findWithInventory(maHangHoa, client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT 
                h.*,
                n.ten_nhom,
                CASE 
                    WHEN h.loai_quan_ly = 'SERIAL' THEN
                        (SELECT COUNT(*) FROM tm_hang_hoa_serial 
                         WHERE ma_hang_hoa = h.ma_hang_hoa AND trang_thai = 'TON_KHO')
                    ELSE
                        (SELECT COALESCE(SUM(so_luong_ton - so_luong_khoa), 0) 
                         FROM tm_hang_hoa_ton_kho 
                         WHERE ma_hang_hoa = h.ma_hang_hoa)
                END as tong_ton_kho
            FROM ${this.tableName} h
            LEFT JOIN dm_nhom_hang n ON h.ma_nhom_hang = n.ma_nhom
            WHERE h.ma_hang_hoa = $1`,
      [maHangHoa],
    );
    return result.rows[0];
  }
}

module.exports = new HangHoaRepository();
