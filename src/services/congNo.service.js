const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");

class CongNoService {
  /* =====================================================
   * LẤY TỔNG HỢP CÔNG NỢ (AI NỢ AI BAO NHIÊU)
   * ===================================================== */
  async getTongHop(filters = {}) {
    const { ma_kho_no, ma_kho_co } = filters;
    let sql = `
      SELECT 
        cn.*,
        k_no.ten_kho as ten_kho_no,
        k_co.ten_kho as ten_kho_co
      FROM tm_cong_no_kho cn
      JOIN sys_kho k_no ON cn.ma_kho_no = k_no.ma_kho
      JOIN sys_kho k_co ON cn.ma_kho_co = k_co.ma_kho
      WHERE cn.con_lai > 0
    `;
    const params = [];

    if (ma_kho_no) {
      params.push(ma_kho_no);
      sql += ` AND cn.ma_kho_no = $${params.length}`;
    }

    if (ma_kho_co) {
      params.push(ma_kho_co);
      sql += ` AND cn.ma_kho_co = $${params.length}`;
    }

    sql += ` ORDER BY cn.ngay_cap_nhat DESC`;

    const result = await pool.query(sql, params);
    return result.rows;
  }

  /* =====================================================
   * LẤY CHI TIẾT CÔNG NỢ (CÁC PHIẾU CHƯA THANH TOÁN)
   * ===================================================== */
  async getChiTiet(ma_kho_no, ma_kho_co) {
    const sql = `
      SELECT 
        ct.*,
        ck.so_phieu_xuat,
        ck.so_phieu_nhap
      FROM tm_cong_no_chi_tiet ct
      LEFT JOIN tm_chuyen_kho ck ON ct.so_phieu_chuyen_kho = ck.so_phieu
      WHERE ct.ma_kho_no = $1 
        AND ct.ma_kho_co = $2
        AND ct.con_lai > 0
      ORDER BY ct.ngay_phat_sinh ASC
    `;
    const result = await pool.query(sql, [ma_kho_no, ma_kho_co]);
    return result.rows;
  }

  /* =====================================================
   * THANH TOÁN CÔNG NỢ
   * ===================================================== */
  async thanhToan(data, nguoi_thuc_hien) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        ma_kho_tra,
        ma_kho_nhan,
        so_tien,
        hinh_thuc,
        dien_giai,
        chi_tiet_thanh_toan, // Array of { id_cong_no, so_tien_tt } opt
      } = data;

      // 1. Tạo Phiếu Thanh Toán
      const so_phieu = `TT-${Date.now()}`;

      await client.query(
        `
        INSERT INTO tm_thanh_toan_kho (
          so_phieu, ngay_thanh_toan, ma_kho_tra, ma_kho_nhan,
          so_tien, hinh_thuc, nguoi_tra, dien_giai
        )
        VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)
        `,
        [
          so_phieu,
          ma_kho_tra,
          ma_kho_nhan,
          so_tien,
          hinh_thuc,
          nguoi_thuc_hien,
          dien_giai,
        ]
      );

      // 2. Phân bổ tiền thanh toán vào các khoản nợ cũ nhất trước (FIFO)
      // hoặc theo chi tiết chỉ định
      let tien_con_lai = Number(so_tien);

      // Lấy các khoản nợ còn lại (FIFO)
      const noRes = await client.query(
        `
        SELECT id, so_phieu_chuyen_kho, con_lai
        FROM tm_cong_no_chi_tiet
        WHERE ma_kho_no = $1 AND ma_kho_co = $2 AND con_lai > 0
        ORDER BY ngay_phat_sinh ASC
        FOR UPDATE
        `,
        [ma_kho_tra, ma_kho_nhan]
      );

      for (const khoan_no of noRes.rows) {
        if (tien_con_lai <= 0) break;

        const so_tien_can_tra = Number(khoan_no.con_lai);
        const so_tien_tra_nay = Math.min(tien_con_lai, so_tien_can_tra);

        // Cập nhật khoản nợ chi tiết
        await client.query(
          `
          UPDATE tm_cong_no_chi_tiet
          SET da_thanh_toan = da_thanh_toan + $1,
              con_lai = con_lai - $1,
              trang_thai = CASE WHEN (con_lai - $1) = 0 THEN 'DA_TT' ELSE 'DANG_TT' END
          WHERE id = $2
          `,
          [so_tien_tra_nay, khoan_no.id]
        );

        // Lưu chi tiết thanh toán
        await client.query(
          `
          INSERT INTO tm_thanh_toan_chi_tiet (
            ma_phieu_thanh_toan, ma_cong_no_chi_tiet, so_tien_thanh_toan
          ) VALUES ($1, $2, $3)
          `,
          [so_phieu, khoan_no.id, so_tien_tra_nay]
        );

        tien_con_lai -= so_tien_tra_nay;
      }

      // 3. Cập nhật Tổng Nợ (tm_cong_no_kho)
      await client.query(
        `
        UPDATE tm_cong_no_kho
        SET tong_da_tra = tong_da_tra + $1,
            con_lai = con_lai - $1,
            ngay_cap_nhat = NOW()
        WHERE ma_kho_no = $2 AND ma_kho_co = $3
        `,
        [so_tien, ma_kho_tra, ma_kho_nhan]
      );

      await client.query("COMMIT");
      return { success: true, so_phieu };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new CongNoService();
