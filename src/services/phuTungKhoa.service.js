const { pool } = require('../config/database');

class PhuTungKhoaService {
  /**
   * KHÓA PHỤ TÙNG
   */
  static async lock({
    ma_pt,
    ma_kho,
    so_phieu,
    loai_phieu,
    so_luong,
    ly_do
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lấy tồn kho + khóa hiện tại (FOR UPDATE để chống race)
      const tonRes = await client.query(
        `
        SELECT so_luong_ton, so_luong_khoa
        FROM tm_phu_tung_ton_kho
        WHERE ma_pt = $1 AND ma_kho = $2
        FOR UPDATE
        `,
        [ma_pt, ma_kho]
      );

      if (tonRes.rowCount === 0) {
        throw new Error('Phụ tùng chưa tồn tại trong kho');
      }

      const { so_luong_ton, so_luong_khoa } = tonRes.rows[0];
      const kha_dung = so_luong_ton - so_luong_khoa;

      if (kha_dung < so_luong) {
        throw new Error('Số lượng khả dụng không đủ để khóa');
      }

      // 2. Ghi bảng khóa
      await client.query(
        `
        INSERT INTO tm_phu_tung_khoa
        (ma_pt, ma_kho, so_phieu, loai_phieu, so_luong_khoa, ngay_khoa, ly_do)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6)
        `,
        [ma_pt, ma_kho, so_phieu, loai_phieu, so_luong, ly_do]
      );

      // 3. Cộng dồn số lượng khóa
      await client.query(
        `
        UPDATE tm_phu_tung_ton_kho
        SET so_luong_khoa = so_luong_khoa + $1,
            ngay_cap_nhat = NOW()
        WHERE ma_pt = $2 AND ma_kho = $3
        `,
        [so_luong, ma_pt, ma_kho]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * MỞ KHÓA THEO PHIẾU
   */
  static async unlockBySoPhieu(so_phieu) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lấy tất cả dòng khóa của phiếu
      const khoaRes = await client.query(
        `
        SELECT ma_pt, ma_kho, so_luong_khoa
        FROM tm_phu_tung_khoa
        WHERE so_phieu = $1
        `,
        [so_phieu]
      );

      // 2. Trả lại số lượng khóa
      for (const row of khoaRes.rows) {
        await client.query(
          `
          UPDATE tm_phu_tung_ton_kho
          SET so_luong_khoa = so_luong_khoa - $1,
              ngay_cap_nhat = NOW()
          WHERE ma_pt = $2 AND ma_kho = $3
          `,
          [row.so_luong_khoa, row.ma_pt, row.ma_kho]
        );
      }

      // 3. Xóa bản ghi khóa
      await client.query(
        `DELETE FROM tm_phu_tung_khoa WHERE so_phieu = $1`,
        [so_phieu]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * LẤY DS PHỤ TÙNG ĐANG KHÓA THEO KHO
   */
  static async getByKho(ma_kho) {
    const result = await pool.query(
      `
      SELECT
        k.id,
        k.ma_pt,
        pt.ten_pt,
        k.so_phieu,
        k.loai_phieu,
        k.so_luong_khoa,
        k.ngay_khoa,
        k.ly_do
      FROM tm_phu_tung_khoa k
      JOIN tm_phu_tung pt ON pt.ma_pt = k.ma_pt
      WHERE k.ma_kho = $1
      ORDER BY k.ngay_khoa DESC
      `,
      [ma_kho]
    );
    return result.rows;
  }
}

module.exports = PhuTungKhoaService;
