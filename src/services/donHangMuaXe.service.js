const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");
const { withTransaction } = require("../ultils/transaction");

class DonHangMuaXeService {
  /* =========================
   * VALIDATION
   * ========================= */

  _validateCreateHeader(data) {
    if (!data.ma_kho_nhap || !data.ma_ncc) {
      throw { status: 400, message: "Thiếu kho nhập hoặc nhà cung cấp" };
    }
  }

  _validateCreateDetail(data) {
    if (!data.ma_loai_xe || !data.so_luong || !data.don_gia) {
      throw { status: 400, message: "Thiếu dữ liệu chi tiết đơn" };
    }
  }

  async _checkTrangThai(soPhieu, expectedStatus, client = pool) {
    const result = await client.query(
      `SELECT trang_thai FROM tm_don_hang_mua_xe WHERE so_phieu = $1`,
      [soPhieu]
    );

    if (!result.rows.length) {
      throw { status: 404, message: "Đơn hàng không tồn tại" };
    }

    if (expectedStatus && result.rows[0].trang_thai !== expectedStatus) {
      throw {
        status: 400,
        message: `Đơn không ở trạng thái ${expectedStatus}`,
      };
    }

    return result.rows[0].trang_thai;
  }

  /* =========================
   * 1. Tạo đơn mua (HEADER)
   * ========================= */

  async createDonHang(data, userId) {
    this._validateCreateHeader(data);

    return withTransaction(pool, async (client) => {
      const result = await client.query(
        `
        INSERT INTO tm_don_hang_mua_xe (
          so_phieu,
          ngay_dat_hang,
          ma_kho_nhap,
          ma_ncc,
          tong_tien,
          trang_thai,
          nguoi_tao,
          ngay_tao
        ) VALUES (
          CONCAT('PO', TO_CHAR(NOW(),'YYYYMMDDHH24MISS')),
          CURRENT_DATE,
          $1, $2,
          $3,
          $4,
          $5,
          NOW()
        )
        RETURNING *
        `,
        [
          data.ma_kho_nhap,
          data.ma_ncc,
          data.tong_tien || 0,
          TRANG_THAI.NHAP,
          userId,
        ]
      );

      return result.rows[0];
    });
  }

  /* =========================
   * 2. Thêm chi tiết đơn
   * ========================= */

  async addChiTiet(soPhieu, data) {
    this._validateCreateDetail(data);
    await this._checkTrangThai(soPhieu, TRANG_THAI.NHAP);

    const result = await pool.query(
      `
      INSERT INTO tm_don_hang_mua_xe_ct (
        ma_phieu,
        stt,
        ma_loai_xe,
        ma_mau,
        so_luong,
        don_gia,
        thanh_tien,
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
        trang_thai = $2,
        nguoi_gui = $3
      WHERE so_phieu = $1
        AND trang_thai = $4
      RETURNING *
      `,
      [soPhieu, TRANG_THAI.GUI_DUYET, userId, TRANG_THAI.NHAP]
    );

    if (!result.rowCount) {
      throw { status: 400, message: "Không thể gửi duyệt đơn" };
    }

    return result.rows[0];
  }

  /* =========================
   * 4. Duyệt / Từ chối
   * ========================= */

  async duyetDonHang(soPhieu, userId) {
    const result = await pool.query(
      `
      UPDATE tm_don_hang_mua_xe
      SET 
        trang_thai = $2,
        nguoi_duyet = $3,
        ngay_duyet = NOW()
      WHERE so_phieu = $1
        AND trang_thai = $4
      RETURNING *
      `,
      [soPhieu, TRANG_THAI.DA_DUYET, userId, TRANG_THAI.GUI_DUYET]
    );

    if (!result.rowCount) {
      throw { status: 400, message: "Đơn chưa ở trạng thái chờ duyệt" };
    }

    return result.rows[0];
  }

  async tuChoiDonHang(soPhieu, userId, lyDo) {
    const result = await pool.query(
      `
      UPDATE tm_don_hang_mua_xe
      SET 
        trang_thai = $2,
        nguoi_duyet = $3,
        ngay_duyet = NOW(),
        dien_giai = $4
      WHERE so_phieu = $1
        AND trang_thai = $5
      RETURNING *
      `,
      [soPhieu, TRANG_THAI.DA_HUY, userId, lyDo, TRANG_THAI.GUI_DUYET]
    );

    if (!result.rowCount) {
      throw { status: 400, message: "Đơn không ở trạng thái chờ duyệt" };
    }

    return result.rows[0];
  }

  /* =========================
   * 5. Xóa chi tiết
   * ========================= */

  async deleteChiTiet(soPhieu, id) {
    await this._checkTrangThai(soPhieu, TRANG_THAI.NHAP);

    const result = await pool.query(
      `
      DELETE FROM tm_don_hang_mua_xe_ct
      WHERE ma_phieu = $1 AND id = $2
      RETURNING *
      `,
      [soPhieu, id]
    );

    if (!result.rowCount) {
      throw { status: 404, message: "Chi tiết không tồn tại" };
    }

    return result.rows[0];
  }

  /* =========================
   * 6. Lấy chi tiết đơn
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
      `SELECT * FROM tm_don_hang_mua_xe_ct WHERE ma_phieu = $1`,
      [soPhieu]
    );

    return {
      ...header.rows[0],
      chi_tiet: details.rows,
    };
  }

  /* =========================
   * 7. Get list (pagination)
   * ========================= */

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
        so_phieu ILIKE $${idx}
        OR ma_ncc ILIKE $${idx}
      )`);
      values.push(`%${keyword}%`);
      idx++;
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const safeLimit = Math.min(Number(limit) || 20, 100);
    const offset = (Number(page) - 1) * safeLimit;

    const dataQuery = `
      SELECT *
      FROM tm_don_hang_mua_xe
      ${whereClause}
      ORDER BY ngay_dat_hang DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM tm_don_hang_mua_xe
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [...values, safeLimit, offset]),
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
