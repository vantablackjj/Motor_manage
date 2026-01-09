const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");

class ThuChiService {
  // Helper: Sinh mã phiếu tự động (PT/PC + YYYYMMDD + Sequence)
  async _generateSoPhieu(client, loai) {
    const prefix = loai === "THU" ? "PT" : "PC";
    const { rows } = await client.query(`
      SELECT 
        '${prefix}' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_thu_chi')::text, 6, '0')
        AS so_phieu
    `);
    return rows[0].so_phieu;
  }

  async taoPhieu(data) {
    const {
      nguoi_tao,
      ngay_giao_dich,
      ma_kho,
      ma_kh,
      so_tien,
      loai,
      dien_giai,
    } = data;

    // Use transaction for safe code generation
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Auto-generate so_phieu
      const so_phieu = await this._generateSoPhieu(client, loai);

      const result = await client.query(
        `
        INSERT INTO tm_thu_chi (
          so_phieu, nguoi_tao, ngay_giao_dich,
          ma_kho, ma_kh, so_tien, loai,
          dien_giai, trang_thai
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `,
        [
          so_phieu,
          nguoi_tao,
          ngay_giao_dich,
          ma_kho,
          ma_kh,
          so_tien,
          loai,
          dien_giai || null,
          TRANG_THAI.NHAP,
        ]
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

  async guiDuyet(so_phieu, nguoi_gui) {
    const result = await pool.query(
      `
      UPDATE tm_thu_chi
      SET trang_thai = $1,
          nguoi_gui = $2,
          ngay_gui = NOW()
      WHERE so_phieu = $3
        AND trang_thai = $4
      RETURNING *
    `,
      [TRANG_THAI.GUI_DUYET, nguoi_gui, so_phieu, TRANG_THAI.NHAP]
    );

    if (result.rowCount === 0) {
      throw new Error("Phiếu không hợp lệ để gửi duyệt");
    }

    return result.rows[0];
  }

  async pheDuyet(so_phieu, nguoi_duyet) {
    const result = await pool.query(
      `
      UPDATE tm_thu_chi
      SET trang_thai = $1,
          nguoi_duyet = $2,
          ngay_duyet = NOW()
      WHERE so_phieu = $3
        AND trang_thai = $4
      RETURNING *
    `,
      [TRANG_THAI.DA_DUYET, nguoi_duyet, so_phieu, TRANG_THAI.GUI_DUYET]
    );

    if (result.rowCount === 0) {
      throw new Error("Phiếu không ở trạng thái chờ duyệt");
    }

    return result.rows[0];
  }

  async huyPhieu(so_phieu, nguoi_huy, ly_do) {
    const result = await pool.query(
      `
      UPDATE tm_thu_chi
      SET trang_thai = $1,
          nguoi_huy = $2,
          ly_do_huy = $3,
          ngay_huy = NOW()
      WHERE so_phieu = $4
        AND trang_thai IN ($5,$6)
      RETURNING *
    `,
      [
        TRANG_THAI.DA_HUY,
        nguoi_huy,
        ly_do || null,
        so_phieu,
        TRANG_THAI.NHAP,
        TRANG_THAI.GUI_DUYET,
      ]
    );

    if (result.rowCount === 0) {
      throw new Error("Không thể hủy phiếu đã duyệt");
    }

    return result.rows[0];
  }

  async getDanhSach(filter = {}) {
    const {
      loai,
      trang_thai,
      ma_kho,
      ma_kh,
      tu_ngay,
      den_ngay,
      keyword,
      page = 1,
      limit = 20,
    } = filter;

    const conditions = [];
    const values = [];

    if (loai) {
      values.push(loai);
      conditions.push(`loai = $${values.length}`);
    }

    if (trang_thai) {
      values.push(trang_thai);
      conditions.push(`trang_thai = $${values.length}`);
    }

    if (ma_kho) {
      values.push(ma_kho);
      conditions.push(`ma_kho = $${values.length}`);
    }

    if (ma_kh) {
      values.push(ma_kh);
      conditions.push(`ma_kh = $${values.length}`);
    }

    if (tu_ngay) {
      values.push(tu_ngay);
      conditions.push(`ngay_giao_dich >= $${values.length}`);
    }

    if (den_ngay) {
      values.push(den_ngay);
      conditions.push(`ngay_giao_dich <= $${values.length}`);
    }

    if (keyword) {
      values.push(`%${keyword}%`);
      conditions.push(`(
        so_phieu ILIKE $${values.length}
        OR dien_giai ILIKE $${values.length}
      )`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const safeLimit = Math.min(Number(limit) || 20, 100);
    const offset = (Number(page) - 1) * safeLimit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM tm_thu_chi
      ${whereClause}
    `;

    // Get data
    const dataQuery = `
      SELECT
        id,
        so_phieu,
        loai,
        so_tien,
        trang_thai,
        ma_kho,
        ma_kh,
        ngay_giao_dich,
        nguoi_tao,
        ngay_tao
      FROM tm_thu_chi
      ${whereClause}
      ORDER BY ngay_tao DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, values),
      pool.query(dataQuery, [...values, safeLimit, offset]),
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

  async getChiTiet(so_phieu) {
    const result = await pool.query(
      `
      SELECT
        id,
        so_phieu,
        loai,
        so_tien,
        dien_giai,
        trang_thai,
        ma_kho,
        ma_kh,
        ngay_giao_dich,
        nguoi_tao,
        ngay_tao,
        nguoi_gui,
        ngay_gui,
        nguoi_duyet,
        ngay_duyet,
        nguoi_huy,
        ngay_huy,
        ly_do_huy,
        lien_ket_phieu
      FROM tm_thu_chi
      WHERE so_phieu = $1
    `,
      [so_phieu]
    );

    return result.rows[0] || null;
  }
}

module.exports = new ThuChiService();
