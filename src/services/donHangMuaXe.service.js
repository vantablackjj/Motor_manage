const { pool } = require("../config/database");

class DonHangMuaXeService {
  /* =========================
   * 1. Tạo đơn mua (header)
   * ========================= */
  async createDonHang(data, userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (!data.ma_kho_nhap || !data.ma_ncc) {
        throw { status: 400, message: "Thiếu kho nhập hoặc nhà cung cấp" };
      }

      const result = await client.query(
        `
        INSERT INTO tm_don_hang_mua_xe (
          so_phieu, ngay_dat_hang,
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
      `,
        [data.ma_kho_nhap, data.ma_ncc, data.tong_tien, userId]
      );

      await client.query("COMMIT");
      return result.rows[0];
    } catch (err) {
      await client.query("ROLLBACK");
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
      throw { status: 400, message: "Thiếu dữ liệu chi tiết" };
    }

    const result = await pool.query(
      `
      INSERT INTO tm_don_hang_mua_xe_ct (
        ma_phieu,stt, ma_loai_xe, ma_mau,
        so_luong, don_gia,thanh_tien,
        da_nhap_kho
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,false
      )
      RETURNING *
    `,
      [
        soPhieu,
        data.stt,
        data.ma_loai_xe,
        data.ma_mau || null,
        data.so_luong,
        data.don_gia,
        data.thanh_tien,
      ]
    );

    return result.rows[0];
  }

  /* =========================
   * 3. Gửi duyệt
   * ========================= */
  async submitDonHang(soPhieu, userId) {
    const result = await pool.query(
      `
      UPDATE tm_don_hang_mua_xe
      SET 
        trang_thai = 'GUI_DUYET',
        nguoi_gui = $2
      WHERE so_phieu = $1
        AND trang_thai = 'NHAP'
      RETURNING *
    `,
      [soPhieu, userId]
    );

    if (!result.rowCount) {
      throw { status: 400, message: "Không thể gửi duyệt đơn này" };
    }

    return result.rows[0];
  }

  /* =========================
   * 4. Duyệt đơn
   * ========================= */
  async duyetDonHang(soPhieu, userId) {
    const result = await pool.query(
      `
      UPDATE tm_don_hang_mua_xe
      SET 
        trang_thai = 'DA_DUYET',
        nguoi_duyet = $2,
        ngay_duyet = NOW()
      WHERE so_phieu = $1
        AND trang_thai = 'GUI_DUYET'
      RETURNING *
    `,
      [soPhieu, userId]
    );

    if (!result.rowCount) {
      throw { status: 400, message: "Đơn chưa ở trạng thái chờ duyệt" };
    }

    return result.rows[0];
  }

  /* =========================
   * 4.5. Xóa chi tiết đơn
   * ========================= */
  async deleteChiTiet(soPhieu, id) {
    // Check Status first
    const header = await pool.query(
      `SELECT trang_thai FROM tm_don_hang_mua_xe WHERE so_phieu = $1`,
      [soPhieu]
    );
    if (!header.rows.length) {
      throw { status: 404, message: "Đơn hàng không tồn tại" };
    }
    if (header.rows[0].trang_thai !== "NHAP") {
      throw {
        status: 400,
        message: "Chỉ được xóa chi tiết khi đơn ở trạng thái NHAP",
      };
    }

    const result = await pool.query(
      `DELETE FROM tm_don_hang_mua_xe_ct WHERE ma_phieu = $1 AND id = $2 RETURNING *`,
      [soPhieu, id]
    );

    if (!result.rowCount) {
      throw { status: 404, message: "Chi tiết không tồn tại" };
    }
    return result.rows[0];
  }

  /* =========================
   * 4.6. Từ chối đơn
   * ========================= */
  async tuChoiDonHang(soPhieu, userId, lyDo) {
    const result = await pool.query(
      `
      UPDATE tm_don_hang_mua_xe
      SET 
        trang_thai = 'DA_HUY',
        nguoi_duyet = $2,
        ngay_duyet = NOW(),
        dien_giai = $3
      WHERE so_phieu = $1
        AND trang_thai = 'GUI_DUYET'
      RETURNING *
    `,
      [soPhieu, userId, lyDo]
    );

    if (!result.rowCount) {
      throw { status: 400, message: "Đơn không ở trạng thái chờ duyệt để hủy" };
    }

    return result.rows[0];
  }

  /* =========================
   * 5. Lấy chi tiết đơn
   * ========================= */
  async getDetail(soPhieu) {
    const header = await pool.query(
      `SELECT * FROM tm_don_hang_mua_xe WHERE so_phieu = $1`,
      [soPhieu]
    );

    if (!header.rows.length) {
      throw { status: 404, message: "Đơn hàng không tồn tại" };
    }

    const details = await pool.query(
      `SELECT * FROM tm_don_hang_mua_xe_ct WHERE so_phieu = $1`,
      [soPhieu]
    );

    return {
      ...header.rows[0],
      chi_tiet: details.rows,
    };
  }
  async getList(filters = {}) {
    const {
      trang_thai,
      ma_kho_nhap,
      tu_ngay,
      den_ngay,
      keyword,
      page = 1,
      limit = 20,
    } = filters;

    const conditions = [];
    const values = [];
    let idx = 1;

    /* =========================
     * WHERE conditions
     * ========================= */

    if (trang_thai) {
      conditions.push(`trang_thai = $${idx++}`);
      values.push(trang_thai);
    }

    if (ma_kho_nhap) {
      conditions.push(`ma_kho_nhap = $${idx++}`);
      values.push(ma_kho_nhap);
    }

    if (tu_ngay) {
      conditions.push(`ngay_dat_hang >= $${idx++}`);
      values.push(tu_ngay);
    }

    if (den_ngay) {
      conditions.push(`ngay_dat_hang <= $${idx++}`);
      values.push(den_ngay);
    }

    if (keyword) {
      conditions.push(`(
      ma_phieu ILIKE $${idx}
      OR ma_ncc ILIKE $${idx}
    )`);
      values.push(`%${keyword}%`);
      idx++;
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    /* =========================
     * Pagination
     * ========================= */

    const safeLimit = Math.min(Number(limit) || 20, 100);
    const offset = (Number(page) - 1) * safeLimit;

    /* =========================
     * Main query
     * ========================= */

    const dataQuery = `
    SELECT *
    FROM tm_don_hang_mua_xe
    ${whereClause}
    ORDER BY ngay_dat_hang DESC
    LIMIT $${idx++}
    OFFSET $${idx++}
  `;

    const dataValues = [...values, safeLimit, offset];

    /* =========================
     * Count query
     * ========================= */

    const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM tm_don_hang_mua_xe
    ${whereClause}
  `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataValues),
      pool.query(countQuery, values),
    ]);

    return {
      data: dataResult.rows,
      pagination: {
        page: Number(page),
        limit: safeLimit,
        total: countResult.rows[0].total,
        total_pages: Math.ceil(countResult.rows[0].total / safeLimit),
      },
    };
  }
}

module.exports = new DonHangMuaXeService();
