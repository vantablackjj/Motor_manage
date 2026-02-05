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

  async taoPhieu(data, externalClient = null) {
    const {
      nguoi_tao,
      ngay_giao_dich,
      ma_kho,
      ma_kh,
      so_tien,
      loai,
      hinh_thuc,
      dien_giai,
      ma_hoa_don, // Added support for linking invoice
    } = data;

    // Use transaction for safe code generation
    const client = externalClient || (await pool.connect());
    const shouldManageTransaction = !externalClient;

    try {
      if (shouldManageTransaction) await client.query("BEGIN");

      // Auto-generate so_phieu
      const so_phieu = await this._generateSoPhieu(client, loai);

      const result = await client.query(
        `
        INSERT INTO tm_phieu_thu_chi (
          so_phieu_tc, created_by, ngay_giao_dich,
          ma_kho, ma_doi_tac, so_tien, loai_phieu,
          hinh_thuc, noi_dung, trang_thai, ma_hoa_don
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11)
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
          hinh_thuc || "TIEN_MAT",
          dien_giai || null,
          TRANG_THAI.NHAP,
          ma_hoa_don,
        ],
      );

      if (shouldManageTransaction) await client.query("COMMIT");
      return result.rows[0];
    } catch (err) {
      if (shouldManageTransaction) await client.query("ROLLBACK");
      throw err;
    } finally {
      if (shouldManageTransaction) client.release();
    }
  }

  async guiDuyet(so_phieu, nguoi_gui) {
    const result = await pool.query(
      `
      UPDATE tm_phieu_thu_chi
      SET trang_thai = $1,
          nguoi_gui = $2,
          ngay_gui = NOW()
      WHERE so_phieu_tc = $3
        AND trang_thai = $4
      RETURNING *
    `,
      [TRANG_THAI.GUI_DUYET, nguoi_gui, so_phieu, TRANG_THAI.NHAP],
    );

    if (result.rowCount === 0) {
      throw new Error("Phiếu không hợp lệ để gửi duyệt");
    }

    return result.rows[0];
  }

  async pheDuyet(so_phieu, nguoi_duyet, externalClient = null) {
    const client = externalClient || (await pool.connect());
    const shouldManageTransaction = !externalClient;

    try {
      if (shouldManageTransaction) await client.query("BEGIN");

      // Check current status first (Optional but good for feedback)
      // Modify query to allow approving from NHAP directly if needed by system flow,
      // but standard flow is GUI_DUYET -> DA_DUYET.
      // For auto-approve system flow, we might need to handle NHAP too.
      // Let's stick to strict flow for now, caller acts as "System" that moves limits.

      const result = await client.query(
        `
        UPDATE tm_phieu_thu_chi
        SET trang_thai = $1,
            nguoi_duyet = $2,
            ngay_duyet = NOW()
        WHERE so_phieu_tc = $3
          AND trang_thai IN ($4, $5) 
        RETURNING *
      `,
        [
          TRANG_THAI.DA_DUYET,
          nguoi_duyet,
          so_phieu,
          TRANG_THAI.GUI_DUYET,
          TRANG_THAI.NHAP,
        ], // Allow approving from NHAP for auto-system
      );

      if (result.rowCount === 0) {
        throw new Error("Phiếu không ở trạng thái chờ duyệt (hoặc Nhập)");
      }

      const phieu = result.rows[0];

      // Xử lý cập nhật công nợ nếu là phiếu thanh toán nợ nội bộ
      if (phieu.metadata && phieu.metadata.type === "THANH_TOAN_NO_NB") {
        const { ma_kho_tra, ma_kho_nhan } = phieu.metadata;
        const CongNoService = require("./congNo.service");
        // Pass client to share transaction
        await CongNoService.processDebtPayment(
          ma_kho_tra,
          ma_kho_nhan,
          phieu.so_tien,
          client,
        );
      } else if (phieu.ma_doi_tac) {
        // Nếu là phiếu thu chi cho đối tác, cập nhật công nợ đối tác
        const CongNoService = require("./congNo.service");
        const loai_cong_no =
          phieu.loai_phieu === "THU" ? "PHAI_THU" : "PHAI_TRA";
        await CongNoService.processDoiTacPayment(
          phieu.ma_doi_tac,
          loai_cong_no,
          phieu.so_tien,
          client,
        );
      }

      if (shouldManageTransaction) await client.query("COMMIT");
      return phieu;
    } catch (error) {
      if (shouldManageTransaction) await client.query("ROLLBACK");
      throw error;
    } finally {
      if (shouldManageTransaction) client.release();
    }
  }

  async huyPhieu(so_phieu, nguoi_huy, ly_do) {
    const result = await pool.query(
      `
      UPDATE tm_phieu_thu_chi
      SET trang_thai = $1,
          nguoi_huy = $2,
          ly_do_huy = $3,
          ngay_huy = NOW()
      WHERE so_phieu_tc = $4
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
      ],
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
      conditions.push(`loai_phieu = $${values.length}`);
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
      conditions.push(`ma_doi_tac = $${values.length}`); // Fixed: ma_kh -> ma_doi_tac
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
        so_phieu_tc ILIKE $${values.length} 
        OR noi_dung ILIKE $${values.length}
      )`); // Fixed: so_phieu -> so_phieu_tc, dien_giai -> noi_dung
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const safeLimit = Math.min(Number(limit) || 20, 100);
    const offset = (Number(page) - 1) * safeLimit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM tm_phieu_thu_chi
      ${whereClause}
    `;

    // Get data
    const dataQuery = `
      SELECT
        id,
        so_phieu_tc as so_phieu,
        loai_phieu as loai,
        so_tien,
        trang_thai,
        ma_kho,
        ma_doi_tac as ma_kh,
        ngay_giao_dich,
        created_by as nguoi_tao,
        created_at
      FROM tm_phieu_thu_chi
      ${whereClause}
      ORDER BY created_at DESC
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
        so_phieu_tc as so_phieu, 
        loai_phieu as loai, 
        so_tien, 
        trang_thai, 
        ma_kho, 
        ma_doi_tac as ma_kh, 
        ngay_giao_dich, 
        created_by as nguoi_tao, 
        noi_dung as dien_giai
      FROM tm_phieu_thu_chi
      WHERE TRIM(so_phieu_tc) = $1
    `,
      [so_phieu?.trim()],
    );

    return result.rows[0] || null;
  }

  async getAll(filter = {}) {
    const { loai, trang_thai, ma_kho, ma_kh, tu_ngay, den_ngay, keyword } =
      filter;

    const conditions = [];
    const values = [];

    if (loai) {
      values.push(loai);
      conditions.push(`tc.loai_phieu = $${values.length}`);
    }

    if (trang_thai) {
      values.push(trang_thai);
      conditions.push(`tc.trang_thai = $${values.length}`);
    }

    if (ma_kho) {
      values.push(ma_kho);
      conditions.push(`tc.ma_kho = $${values.length}`);
    }

    if (ma_kh) {
      values.push(ma_kh);
      conditions.push(`tc.ma_doi_tac = $${values.length}`);
    }

    if (tu_ngay) {
      values.push(tu_ngay);
      conditions.push(`tc.ngay_giao_dich >= $${values.length}`);
    }

    if (den_ngay) {
      values.push(den_ngay);
      conditions.push(`tc.ngay_giao_dich < ($${values.length}::date + 1)`);
    }

    if (keyword) {
      values.push(`%${keyword}%`);
      conditions.push(`(
        tc.so_phieu_tc ILIKE $${values.length} 
        OR tc.noi_dung ILIKE $${values.length}
        OR kh.ten_doi_tac ILIKE $${values.length}
      )`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const query = `
      SELECT
        tc.id,
        tc.so_phieu_tc as so_phieu,
        tc.loai_phieu as loai,
        tc.so_tien,
        tc.trang_thai,
        tc.ma_kho,
        tc.ma_doi_tac as ma_kh,
        kh.ten_doi_tac as ten_kh,
        tc.ngay_giao_dich,
        tc.created_by as nguoi_tao,
        tc.created_at,
        tc.hinh_thuc,
        tc.noi_dung as dien_giai
      FROM tm_phieu_thu_chi tc
      LEFT JOIN dm_doi_tac kh ON tc.ma_doi_tac = kh.ma_doi_tac
      ${whereClause}
      ORDER BY tc.created_at DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows;
  }
}

module.exports = new ThuChiService();
