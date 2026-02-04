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
      FROM tm_cong_no_noi_bo cn
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

    sql += ` ORDER BY cn.updated_at DESC`;

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
        ck.so_don_hang as so_phieu
      FROM tm_cong_no_noi_bo_ct ct
      LEFT JOIN tm_don_hang ck ON ct.so_phieu_chuyen_kho = ck.so_don_hang
      WHERE ct.ma_kho_no = $1 
        AND ct.ma_kho_co = $2
        AND ct.con_lai > 0
      ORDER BY ct.ngay_phat_sinh ASC
    `;
    const result = await pool.query(sql, [ma_kho_no, ma_kho_co]);
    return result.rows;
  }

  /* =====================================================
   * THANH TOÁN CÔNG NỢ (Nội bộ)
   * ===================================================== */
  async thanhToan(data, nguoi_thuc_hien) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { ma_kho_tra, ma_kho_nhan, so_tien, hinh_thuc, dien_giai } = data;

      if (!ma_kho_tra || !ma_kho_nhan || !so_tien) {
        throw new Error(
          "Thiếu thông tin thanh toán: Kho trả, Kho nhận hoặc Số tiền",
        );
      }
      const so_phieu = `TTNB-${Date.now()}`;

      // Metadata to identify this as Debt Payment
      const metadata = JSON.stringify({
        type: "THANH_TOAN_NO_NB",
        ma_kho_tra,
        ma_kho_nhan,
      });

      await client.query(
        `
        INSERT INTO tm_phieu_thu_chi (
          so_phieu_tc, ngay_giao_dich, loai_phieu,
          so_tien, hinh_thuc, ma_kho, noi_dung, created_by,
          metadata, trang_thai
        )
        VALUES ($1, NOW(), 'CHI', $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          so_phieu,
          so_tien,
          hinh_thuc || "TIEN_MAT",
          ma_kho_tra,
          dien_giai ||
            `Thanh toán công nợ nội bộ from ${ma_kho_tra} to ${ma_kho_nhan}`,
          nguoi_thuc_hien,
          metadata,
          TRANG_THAI.NHAP, // Start as NHAP/Pending
        ],
      );

      // NO DEBT UPDATE HERE - Only create voucher

      await client.query("COMMIT");
      return { success: true, so_phieu };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Called when voucher is Approved
  async processDebtPayment(
    ma_kho_tra,
    ma_kho_nhan,
    so_tien,
    externalClient = null,
  ) {
    const client = externalClient || (await pool.connect());
    const shouldManageTransaction = !externalClient;

    try {
      if (shouldManageTransaction) await client.query("BEGIN");

      let tien_con_lai = Number(so_tien);

      const noRes = await client.query(
        `
        SELECT id, con_lai
        FROM tm_cong_no_noi_bo_ct
        WHERE ma_kho_no = $1 AND ma_kho_co = $2 AND con_lai > 0
        ORDER BY ngay_phat_sinh ASC
        FOR UPDATE
        `,
        [ma_kho_tra, ma_kho_nhan],
      );

      for (const khoan_no of noRes.rows) {
        if (tien_con_lai <= 0) break;

        const so_tien_can_tra = Number(khoan_no.con_lai);
        const so_tien_tra_nay = Math.min(tien_con_lai, so_tien_can_tra);

        await client.query(
          `
          UPDATE tm_cong_no_noi_bo_ct
          SET da_thanh_toan = da_thanh_toan + $1,
              trang_thai = (CASE WHEN (so_tien - (da_thanh_toan + $1)) = 0 THEN 'DA_TT' ELSE 'TT_MOT_PHAN' END)::enum_trang_thai_cong_no
          WHERE id = $2
          `,
          [so_tien_tra_nay, khoan_no.id],
        );

        tien_con_lai -= so_tien_tra_nay;
      }

      await client.query(
        `
        UPDATE tm_cong_no_noi_bo
        SET tong_da_tra = tong_da_tra + $1,
            updated_at = NOW()
        WHERE ma_kho_no = $2 AND ma_kho_co = $3
        `,
        [so_tien, ma_kho_tra, ma_kho_nhan],
      );

      if (shouldManageTransaction) await client.query("COMMIT");
      return true;
    } catch (err) {
      if (shouldManageTransaction) await client.query("ROLLBACK");
      throw err;
    } finally {
      if (shouldManageTransaction) client.release();
    }
  }
  /* =====================================================
   * LẤY TỔNG HỢP CÔNG NỢ ĐỐI TÁC
   * ===================================================== */
  async getTongHopDoiTac(filters = {}) {
    const { ma_doi_tac, loai_cong_no } = filters;
    let sql = `
      SELECT cn.*, dt.ten_doi_tac
      FROM tm_cong_no_doi_tac cn
      JOIN dm_doi_tac dt ON cn.ma_doi_tac = dt.ma_doi_tac
      WHERE cn.con_lai > 0
    `;
    const params = [];
    if (ma_doi_tac) {
      params.push(ma_doi_tac);
      sql += ` AND cn.ma_doi_tac = $${params.length}`;
    }
    if (loai_cong_no) {
      params.push(loai_cong_no);
      sql += ` AND cn.loai_cong_no = $${params.length}`;
    }
    sql += ` ORDER BY cn.updated_at DESC`;
    const result = await pool.query(sql, params);
    return result.rows;
  }

  /* =====================================================
   * LẤY CHI TIẾT CÔNG NỢ ĐỐI TÁC
   * ===================================================== */
  async getChiTietDoiTac(ma_doi_tac, loai_cong_no) {
    const sql = `
      SELECT *
      FROM tm_cong_no_doi_tac_ct
      WHERE ma_doi_tac = $1 AND loai_cong_no = $2 AND con_lai > 0
      ORDER BY ngay_phat_sinh ASC
    `;
    const result = await pool.query(sql, [ma_doi_tac, loai_cong_no]);
    return result.rows;
  }
  /* =====================================================
   * GHI NHẬN CÔNG NỢ ĐỐI TÁC
   * ===================================================== */
  async recordDoiTacDebt(
    client,
    {
      ma_doi_tac,
      loai_cong_no,
      so_hoa_don,
      ngay_phat_sinh,
      so_tien,
      han_thanh_toan,
      ghi_chu,
    },
  ) {
    // 1. Ghi chi tiết
    await client.query(
      `
      INSERT INTO tm_cong_no_doi_tac_ct (
        ma_doi_tac, loai_cong_no, so_hoa_don, ngay_phat_sinh, so_tien, han_thanh_toan, ghi_chu
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        ma_doi_tac,
        loai_cong_no,
        so_hoa_don,
        ngay_phat_sinh || new Date(),
        so_tien,
        han_thanh_toan,
        ghi_chu,
      ],
    );

    // 2. Cập nhật tổng hợp
    await client.query(
      `
      INSERT INTO tm_cong_no_doi_tac (ma_doi_tac, loai_cong_no, tong_no)
      VALUES ($1, $2, $3)
      ON CONFLICT (ma_doi_tac, loai_cong_no) DO UPDATE SET
        tong_no = tm_cong_no_doi_tac.tong_no + $3,
        updated_at = CURRENT_TIMESTAMP
    `,
      [ma_doi_tac, loai_cong_no, so_tien],
    );
  }

  /* =====================================================
   * GHI NHẬN CÔNG NỢ NỘI BỘ
   * ===================================================== */
  async recordInternalDebt(
    client,
    {
      ma_kho_no,
      ma_kho_co,
      so_phieu_chuyen_kho,
      ngay_phat_sinh,
      so_tien,
      ghi_chu,
    },
  ) {
    // 1. Ghi chi tiết
    await client.query(
      `
      INSERT INTO tm_cong_no_noi_bo_ct (
        ma_kho_no, ma_kho_co, so_phieu_chuyen_kho, ngay_phat_sinh, so_tien, ghi_chu
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        ma_kho_no,
        ma_kho_co,
        so_phieu_chuyen_kho,
        ngay_phat_sinh || new Date(),
        so_tien,
        ghi_chu,
      ],
    );

    // 2. Cập nhật tổng hợp
    await client.query(
      `
      INSERT INTO tm_cong_no_noi_bo (ma_kho_no, ma_kho_co, tong_no)
      VALUES ($1, $2, $3)
      ON CONFLICT (ma_kho_no, ma_kho_co) DO UPDATE SET
        tong_no = tm_cong_no_noi_bo.tong_no + $3,
        updated_at = CURRENT_TIMESTAMP
    `,
      [ma_kho_no, ma_kho_co, so_tien],
    );
  }
}

module.exports = new CongNoService();
