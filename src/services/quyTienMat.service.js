const { pool } = require("../config/database");

class QuyTienMatService {
  /**
   * Lấy danh sách quỹ theo kho
   */
  async getDanhSachQuy(ma_kho = null) {
    let sql = `
      SELECT 
        q.*,
        k.ten_kho,
        (SELECT COUNT(*) FROM tm_lich_su_quy WHERE ma_quy = q.id) as so_giao_dich
      FROM tm_quy_tien_mat q
      LEFT JOIN sys_kho k ON q.ma_kho = k.ma_kho
      WHERE q.trang_thai = TRUE
    `;

    const params = [];
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND q.ma_kho = $${params.length}`;
    }

    sql += ` ORDER BY q.ma_kho, q.loai_quy`;

    const result = await pool.query(sql, params);
    return result.rows;
  }

  /**
   * Lấy chi tiết một quỹ
   */
  async getChiTietQuy(ma_quy) {
    const result = await pool.query(
      `
      SELECT 
        q.*,
        k.ten_kho
      FROM tm_quy_tien_mat q
      LEFT JOIN sys_kho k ON q.ma_kho = k.ma_kho
      WHERE q.id = $1
    `,
      [ma_quy],
    );

    if (result.rows.length === 0) {
      throw new Error("Không tìm thấy quỹ");
    }

    return result.rows[0];
  }

  /**
   * Lấy lịch sử giao dịch của quỹ
   */
  async getLichSuGiaoDich(ma_quy, filters = {}) {
    let sql = `
      SELECT 
        ls.*,
        ptc.loai_phieu,
        ptc.noi_dung as noi_dung_phieu
      FROM tm_lich_su_quy ls
      LEFT JOIN tm_phieu_thu_chi ptc ON ls.so_phieu_tc = ptc.so_phieu_tc
      WHERE ls.ma_quy = $1
    `;

    const params = [ma_quy];

    if (filters.tu_ngay) {
      params.push(filters.tu_ngay);
      sql += ` AND ls.ngay_giao_dich >= $${params.length}`;
    }

    if (filters.den_ngay) {
      params.push(filters.den_ngay);
      sql += ` AND ls.ngay_giao_dich <= $${params.length}`;
    }

    sql += ` ORDER BY ls.ngay_giao_dich DESC, ls.id DESC`;

    const result = await pool.query(sql, params);
    return result.rows;
  }

  /**
   * Tạo quỹ mới
   */
  async taoQuy(data) {
    const {
      ma_kho,
      loai_quy,
      ten_quy,
      so_du_khoi_tao,
      thong_tin_them,
      ghi_chu,
    } = data;

    const result = await pool.query(
      `
      INSERT INTO tm_quy_tien_mat (
        ma_kho, loai_quy, ten_quy, so_du_khoi_tao, so_du_hien_tai, thong_tin_them, ghi_chu
      ) VALUES ($1, $2, $3, $4, $4, $5, $6)
      RETURNING *
    `,
      [
        ma_kho,
        loai_quy,
        ten_quy,
        so_du_khoi_tao || 0,
        thong_tin_them || {},
        ghi_chu,
      ],
    );

    return result.rows[0];
  }

  /**
   * Cập nhật thông tin quỹ
   */
  async capNhatQuy(ma_quy, data) {
    const { ten_quy, thong_tin_them, ghi_chu, trang_thai } = data;

    const result = await pool.query(
      `
      UPDATE tm_quy_tien_mat
      SET ten_quy = COALESCE($1, ten_quy),
          thong_tin_them = COALESCE($2, thong_tin_them),
          ghi_chu = COALESCE($3, ghi_chu),
          trang_thai = COALESCE($4, trang_thai),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `,
      [ten_quy, thong_tin_them, ghi_chu, trang_thai, ma_quy],
    );

    if (result.rows.length === 0) {
      throw new Error("Không tìm thấy quỹ");
    }

    return result.rows[0];
  }

  /**
   * Lấy tổng quan quỹ của tất cả kho
   */
  async getTongQuanQuy() {
    const result = await pool.query(`
      SELECT 
        k.ma_kho,
        k.ten_kho,
        SUM(CASE WHEN q.loai_quy = 'TIEN_MAT' THEN q.so_du_hien_tai ELSE 0 END) as tien_mat,
        SUM(CASE WHEN q.loai_quy = 'NGAN_HANG' THEN q.so_du_hien_tai ELSE 0 END) as ngan_hang,
        SUM(CASE WHEN q.loai_quy = 'VI_DIEN_TU' THEN q.so_du_hien_tai ELSE 0 END) as vi_dien_tu,
        SUM(q.so_du_hien_tai) as tong_quy
      FROM sys_kho k
      LEFT JOIN tm_quy_tien_mat q ON k.ma_kho = q.ma_kho AND q.trang_thai = TRUE
      WHERE k.status = TRUE
      GROUP BY k.ma_kho, k.ten_kho
      ORDER BY k.ten_kho
    `);

    return result.rows;
  }

  /**
   * Lấy quỹ mặc định theo kho và hình thức thanh toán
   */
  async getQuyMacDinh(ma_kho, hinh_thuc) {
    const result = await pool.query(
      `
      SELECT *
      FROM tm_quy_tien_mat
      WHERE ma_kho = $1 
        AND loai_quy = $2
        AND trang_thai = TRUE
      LIMIT 1
    `,
      [ma_kho, hinh_thuc],
    );

    return result.rows[0] || null;
  }
}

module.exports = new QuyTienMatService();
