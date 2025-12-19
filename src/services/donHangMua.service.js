
const { pool } = require('../config/database');
const { TRANG_THAI } = require('../config/constants');
const PhuTung = require('../models/PhuTung');

class DonHangMuaService {
  // Tạo đơn hàng mua mới
  async taoDonHang(data) {
    const { ma_phieu, ngay_dat_hang, ma_kho_nhap, ma_ncc, nguoi_tao, dien_giai } = data;
    
    const result = await pool.query(
      `INSERT INTO tm_don_hang_mua (
        ma_phieu, ngay_dat_hang, ma_kho_nhap, ma_ncc,
        nguoi_tao, trang_thai, dien_giai
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [ma_phieu, ngay_dat_hang, ma_kho_nhap, ma_ncc, nguoi_tao, TRANG_THAI.NHAP, dien_giai]
    );
    
    return result.rows[0];
  }

  // Thêm phụ tùng vào đơn
  async themPhuTung(ma_phieu, chi_tiet) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Kiểm tra đơn hàng
      const donResult = await client.query(
        'SELECT trang_thai FROM tm_don_hang_mua WHERE ma_phieu = $1',
        [ma_phieu]
      );
      
      if (!donResult.rows[0]) {
        throw new Error('Đơn hàng không tồn tại');
      }
      
      if (donResult.rows[0].trang_thai !== TRANG_THAI.NHAP) {
        throw new Error(`Không thể sửa đơn ở trạng thái ${donResult.rows[0].trang_thai}`);
      }
      
      // Lấy STT tiếp theo
      const sttResult = await client.query(
        'SELECT COALESCE(MAX(stt), 0) + 1 as next_stt FROM tm_don_hang_mua_ct WHERE ma_phieu = $1',
        [ma_phieu]
      );
      const stt = sttResult.rows[0].next_stt;
      
      // Insert chi tiết
      const { ma_pt, ten_pt, don_vi_tinh, so_luong, don_gia } = chi_tiet;
      const thanh_tien = so_luong * don_gia;
      
      await client.query(
        `INSERT INTO tm_don_hang_mua_ct (
          ma_phieu, stt, ma_pt, ten_pt, don_vi_tinh,
          so_luong, don_gia, thanh_tien
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [ma_phieu, stt, ma_pt, ten_pt, don_vi_tinh, so_luong, don_gia, thanh_tien]
      );
      
      // Update tổng tiền
      await client.query(
        `UPDATE tm_don_hang_mua
         SET tong_tien = (
           SELECT SUM(thanh_tien) FROM tm_don_hang_mua_ct WHERE ma_phieu = $1
         )
         WHERE ma_phieu = $1`,
        [ma_phieu]
      );
      
      await client.query('COMMIT');
      
      return { success: true, stt };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Gửi duyệt
  async guiDuyet(ma_phieu, nguoi_gui) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Kiểm tra trạng thái
      const result = await client.query(
        'SELECT trang_thai FROM tm_don_hang_mua WHERE ma_phieu = $1',
        [ma_phieu]
      );
      
      if (!result.rows[0]) {
        throw new Error('Đơn hàng không tồn tại');
      }
      
      if (result.rows[0].trang_thai !== TRANG_THAI.NHAP) {
        throw new Error(`Không thể gửi duyệt đơn ở trạng thái ${result.rows[0].trang_thai}`);
      }
      
      // Kiểm tra có chi tiết chưa
      const ctResult = await client.query(
        'SELECT COUNT(*) as count FROM tm_don_hang_mua_ct WHERE ma_phieu = $1',
        [ma_phieu]
      );
      
      if (ctResult.rows[0].count == 0) {
        throw new Error('Đơn hàng chưa có chi tiết nào');
      }
      
      // Update trạng thái
      await client.query(
        `UPDATE tm_don_hang_mua
         SET trang_thai = $1, nguoi_gui = $2, ngay_gui = CURRENT_TIMESTAMP
         WHERE ma_phieu = $3`,
        [TRANG_THAI.GUI_DUYET, nguoi_gui, ma_phieu]
      );
      
      await client.query('COMMIT');
      
      return { success: true, message: 'Đã gửi duyệt thành công' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Phê duyệt
  async pheDuyet(ma_phieu, nguoi_duyet) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Lấy thông tin đơn hàng
      const donResult = await client.query(
        `SELECT trang_thai, ma_kho_nhap, ma_ncc, tong_tien, ngay_dat_hang
         FROM tm_don_hang_mua 
         WHERE ma_phieu = $1`,
        [ma_phieu]
      );
      
      if (!donResult.rows[0]) {
        throw new Error('Đơn hàng không tồn tại');
      }
      
      const don = donResult.rows[0];
      
      if (don.trang_thai !== TRANG_THAI.GUI_DUYET) {
        throw new Error(`Không thể duyệt đơn ở trạng thái ${don.trang_thai}`);
      }
      
      // Lấy chi tiết
      const chiTietResult = await client.query(
        'SELECT * FROM tm_don_hang_mua_ct WHERE ma_phieu = $1 ORDER BY stt',
        [ma_phieu]
      );
      
      // Xử lý từng phụ tùng
      for (const ct of chiTietResult.rows) {
        // Tăng tồn kho (UPSERT)
        await client.query(
          `INSERT INTO tm_phu_tung_ton_kho (ma_pt, ma_kho, so_luong_ton)
           VALUES ($1, $2, $3)
           ON CONFLICT (ma_pt, ma_kho)
           DO UPDATE SET 
             so_luong_ton = tm_phu_tung_ton_kho.so_luong_ton + $3,
             ngay_cap_nhat = CURRENT_TIMESTAMP`,
          [ct.ma_pt, don.ma_kho_nhap, ct.so_luong]
        );
        
        // Ghi lịch sử
        await client.query(
          `INSERT INTO tm_phu_tung_lich_su (
            ma_pt, loai_giao_dich, so_chung_tu, ngay_giao_dich,
            ma_kho_nhap, so_luong, don_gia, thanh_tien,
            nguoi_thuc_hien, dien_giai
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)`,
          [
            ct.ma_pt, 'NHAP_KHO', ma_phieu, don.ma_kho_nhap,
            ct.so_luong, ct.don_gia, ct.thanh_tien,
            nguoi_duyet, `Nhập từ NCC theo đơn ${ma_phieu}`
          ]
        );
      }
      
      // Tạo phiếu chi tiền
      await client.query(
        `INSERT INTO tm_thu_chi (
          ma_phieu, ngay_giao_dich, loai, ma_kho, ma_kh,
          so_tien, trang_thai, nguoi_tao, nguoi_duyet, ngay_duyet,
          lien_ket_phieu, dien_giai
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, CURRENT_TIMESTAMP, $9, $10)`,
        [
          'PC-' + ma_phieu,
          don.ngay_dat_hang,
          'CHI',
          don.ma_kho_nhap,
          don.ma_ncc,
          don.tong_tien,
          TRANG_THAI.DA_DUYET,
          nguoi_duyet,
          ma_phieu,
          `Chi tiền mua hàng theo đơn ${ma_phieu}`
        ]
      );
      
      // Update đơn hàng
      await client.query(
        `UPDATE tm_don_hang_mua
         SET trang_thai = $1, nguoi_duyet = $2, ngay_duyet = CURRENT_TIMESTAMP
         WHERE ma_phieu = $3`,
        [TRANG_THAI.DA_DUYET, nguoi_duyet, ma_phieu]
      );
      
      await client.query('COMMIT');
      
      return {
        success: true,
        message: `Đã duyệt đơn ${ma_phieu}. Tồn kho đã cập nhật. Đã chi ${don.tong_tien} VNĐ`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Lấy danh sách đơn hàng
  async getDanhSach(filters = {}) {
    let sql = `
      SELECT 
        d.id, d.ma_phieu, d.ngay_dat_hang, d.ma_kho_nhap, d.ma_ncc,
        d.tong_tien, d.trang_thai, d.nguoi_tao, d.nguoi_gui, d.nguoi_duyet,
        d.ngay_tao, d.ngay_gui, d.ngay_duyet, d.dien_giai,
        k.ten_kho, kh.ho_ten as ten_ncc
      FROM tm_don_hang_mua d
      INNER JOIN sys_kho k ON d.ma_kho_nhap = k.ma_kho
      INNER JOIN tm_khach_hang kh ON d.ma_ncc = kh.ma_kh
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.trang_thai) {
      params.push(filters.trang_thai);
      sql += ` AND d.trang_thai = $${params.length}`;
    }
    
    if (filters.ma_kho_nhap) {
      params.push(filters.ma_kho_nhap);
      sql += ` AND d.ma_kho_nhap = $${params.length}`;
    }
    
    if (filters.tu_ngay) {
      params.push(filters.tu_ngay);
      sql += ` AND d.ngay_dat_hang >= $${params.length}`;
    }
    
    if (filters.den_ngay) {
      params.push(filters.den_ngay);
      sql += ` AND d.ngay_dat_hang <= $${params.length}`;
    }
    
    sql += ' ORDER BY d.ngay_dat_hang DESC, d.ma_phieu DESC';
    
    const result = await pool.query(sql, params);
    return result.rows;
  }

  // Lấy chi tiết đơn hàng
  async getChiTiet(ma_phieu) {
    const headerResult = await pool.query(
      `SELECT 
        d.*, k.ten_kho, kh.ho_ten as ten_ncc
       FROM tm_don_hang_mua d
       INNER JOIN sys_kho k ON d.ma_kho_nhap = k.ma_kho
       INNER JOIN tm_khach_hang kh ON d.ma_ncc = kh.ma_kh
       WHERE d.ma_phieu = $1`,
      [ma_phieu]
    );
    
    if (!headerResult.rows[0]) {
      return null;
    }
    
    const detailResult = await pool.query(
      `SELECT * FROM tm_don_hang_mua_ct 
       WHERE ma_phieu = $1 
       ORDER BY stt`,
      [ma_phieu]
    );
    
    return {
      ...headerResult.rows[0],
      chi_tiet: detailResult.rows
    };
  }

  
}

module.exports = new DonHangMuaService();
