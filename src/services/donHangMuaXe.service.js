const {pool} = require('../config/database');

class DonHangMuaXeService {

  /* =========================
   * 1. Tạo đơn mua (header)
   * ========================= */
  async createDonHang(data, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (!data.ma_kho_nhap || !data.ma_ncc) {
        throw { status: 400, message: 'Thiếu kho nhập hoặc nhà cung cấp' };
      }

      const result = await client.query(`
        INSERT INTO tm_don_hang_mua_xe (
          ma_phieu, ngay_dat_hang,
          ma_kho_nhap, ma_ncc,
          tong_tien, trang_thai,
          nguoi_tao, ngay_tao
        ) VALUES (
          CONCAT('PO', TO_CHAR(NOW(),'YYYYMMDDHH24MISS')),
          CURRENT_DATE,
          $1,$2,
          $3,'NHAP',
          $4,NOW()
        )
        RETURNING *
      `, [data.ma_kho_nhap, data.ma_ncc, data.tong_tien,userId]);

      await client.query('COMMIT');
      return result.rows[0];

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /* =========================
   * 2. Thêm chi tiết đơn
   * ========================= */
  async addChiTiet(soPhieu, data) {
    if (!data.ma_loai_xe || !data.so_luong || !data.don_gia) {
      throw { status: 400, message: 'Thiếu dữ liệu chi tiết' };
    }

    const result = await pool.query(`
      INSERT INTO tm_don_hang_mua_xe_ct (
        ma_phieu,stt, ma_loai_xe, ma_mau,
        so_luong, don_gia,
        da_nhap_kho
      ) VALUES (
        $1,$2,$3,$4,$5,$6,false
      )
      RETURNING *
    `, [
      soPhieu,
      data.stt,
      data.ma_loai_xe,
      data.ma_mau || null,
      data.so_luong,
      data.don_gia
    ]);

    return result.rows[0];
  }

  /* =========================
   * 3. Gửi duyệt
   * ========================= */
  async submitDonHang(soPhieu, userId) {
    const result = await pool.query(`
      UPDATE tm_don_hang_mua_xe
      SET 
        trang_thai = 'GUI_DUYET',
        nguoi_gui = $2
      WHERE ma_phieu = $1
        AND trang_thai = 'NHAP'
      RETURNING *
    `, [soPhieu, userId]);

    if (!result.rowCount) {
      throw { status: 400, message: 'Không thể gửi duyệt đơn này' };
    }

    return result.rows[0];
  }

  /* =========================
   * 4. Duyệt đơn
   * ========================= */
  async duyetDonHang(soPhieu, userId) {
    const result = await pool.query(`
      UPDATE tm_don_hang_mua_xe
      SET 
        trang_thai = 'DA_DUYET',
        nguoi_duyet = $2,
        ngay_duyet = NOW()
      WHERE ma_phieu = $1
        AND trang_thai = 'GUI_DUYET'
      RETURNING *
    `, [soPhieu, userId]);

    if (!result.rowCount) {
      throw { status: 400, message: 'Đơn chưa ở trạng thái chờ duyệt' };
    }

    return result.rows[0];
  }

  /* =========================
   * 5. Lấy chi tiết đơn
   * ========================= */
  async getDetail(soPhieu) {
    const header = await pool.query(
      `SELECT * FROM tm_don_hang_mua_xe WHERE ma_phieu = $1`,
      [soPhieu]
    );

    if (!header.rows.length) {
      throw { status: 404, message: 'Đơn hàng không tồn tại' };
    }

    const details = await pool.query(
      `SELECT * FROM tm_don_hang_mua_xe_ct WHERE ma_phieu = $1`,
      [soPhieu]
    );

    return {
      ...header.rows[0],
      chi_tiet: details.rows
    };
  }
}

module.exports = new DonHangMuaXeService();
