const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");
const { withTransaction } = require("../ultils/transaction");
const VehicleService = require("./themXe.service");

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

    if (data.so_luong <= 0 || data.don_gia < 0) {
      throw { status: 400, message: "Số lượng hoặc đơn giá không hợp lệ" };
    }
  }

  async _checkTrangThai(soPhieu, expectedStatus, client) {
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
   * UTILS
   * ========================= */

  async _generateSoPhieu(client) {
    const { rows } = await client.query(`
      SELECT 
        'PO' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_po')::text, 6, '0')
        AS so_phieu
    `);

    return rows[0].so_phieu;
  }

  async _generateNextSTT(client, soPhieu) {
    // 1. Lock header row
    await client.query(
      `
    SELECT 1
    FROM tm_don_hang_mua_xe
    WHERE so_phieu = $1
    FOR UPDATE
    `,
      [soPhieu]
    );

    // 2. Tính STT an toàn
    const { rows } = await client.query(
      `
    SELECT COALESCE(MAX(stt), 0) + 1 AS next_stt
    FROM tm_don_hang_mua_xe_ct
    WHERE ma_phieu = $1
    `,
      [soPhieu]
    );

    return rows[0].next_stt;
  }

  /* =========================
   * 1. Tạo đơn mua (HEADER)
   * ========================= */

  async createDonHang(data, userId) {
    this._validateCreateHeader(data);

    return withTransaction(pool, async (client) => {
      const soPhieu = await this._generateSoPhieu(client);

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
          $1,
          CURRENT_DATE,
          $2,
          $3,
          0,
          $4,
          $5,
          NOW()
        )
        RETURNING *
        `,
        [soPhieu, data.ma_kho_nhap, data.ma_ncc, TRANG_THAI.NHAP, userId]
      );

      return result.rows[0];
    });
  }

  /* =========================
   * 1.1 Tạo đơn mua KÈM CHI TIẾT (ATOMIC)
   * ========================= */

  async createDonHangWithDetails(data, userId) {
    // Validate header
    this._validateCreateHeader(data);

    // Validate chi_tiet array
    if (
      !data.chi_tiet ||
      !Array.isArray(data.chi_tiet) ||
      data.chi_tiet.length === 0
    ) {
      throw { status: 400, message: "Chi tiết đơn hàng không được để trống" };
    }

    // Validate each detail item
    for (const item of data.chi_tiet) {
      this._validateCreateDetail(item);
    }

    return withTransaction(pool, async (client) => {
      // 1. Generate so_phieu
      const soPhieu = await this._generateSoPhieu(client);

      // 2. Insert order header
      const headerResult = await client.query(
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
          $1,
          CURRENT_DATE,
          $2,
          $3,
          0,
          $4,
          $5,
          NOW()
        )
        RETURNING *
        `,
        [soPhieu, data.ma_kho_nhap, data.ma_ncc, TRANG_THAI.NHAP, userId]
      );

      const header = headerResult.rows[0];

      // 3. Insert all detail items
      const chiTietResults = [];
      let tongTien = 0;

      for (let i = 0; i < data.chi_tiet.length; i++) {
        const item = data.chi_tiet[i];
        const stt = i + 1;
        const thanhTien = Number(item.so_luong) * Number(item.don_gia);
        tongTien += thanhTien;

        const detailResult = await client.query(
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
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,false)
          RETURNING *
          `,
          [
            soPhieu,
            stt,
            item.ma_loai_xe,
            item.ma_mau || null,
            item.so_luong,
            item.don_gia,
            thanhTien,
          ]
        );

        chiTietResults.push(detailResult.rows[0]);
      }

      // 4. Update tong_tien in header
      await client.query(
        `
        UPDATE tm_don_hang_mua_xe
        SET tong_tien = $2
        WHERE so_phieu = $1
        `,
        [soPhieu, tongTien]
      );

      // 5. Return complete order with details
      return {
        ...header,
        tong_tien: tongTien,
        chi_tiet: chiTietResults,
      };
    });
  }

  /* =========================
   * 2. Thêm chi tiết đơn
   * ========================= */

  async addChiTiet(soPhieu, data) {
    this._validateCreateDetail(data);

    return withTransaction(pool, async (client) => {
      await this._checkTrangThai(soPhieu, TRANG_THAI.NHAP, client);

      const stt = await this._generateNextSTT(client, soPhieu);
      const thanhTien = Number(data.so_luong) * Number(data.don_gia);

      const result = await client.query(
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
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,false)
        RETURNING *
        `,
        [
          soPhieu,
          stt,
          data.ma_loai_xe,
          data.ma_mau || null,
          data.so_luong,
          data.don_gia,
          thanhTien,
        ]
      );

      // cập nhật tổng tiền header
      await client.query(
        `
        UPDATE tm_don_hang_mua_xe
        SET tong_tien = (
          SELECT COALESCE(SUM(thanh_tien), 0)
          FROM tm_don_hang_mua_xe_ct
          WHERE ma_phieu = $1
        )
        WHERE so_phieu = $1
        `,
        [soPhieu]
      );

      return result.rows[0];
    });
  }

  /* =========================
   * 3. Xóa chi tiết
   * ========================= */

  async deleteChiTiet(soPhieu, stt) {
    return withTransaction(pool, async (client) => {
      await this._checkTrangThai(soPhieu, TRANG_THAI.NHAP, client);

      const result = await client.query(
        `
        DELETE FROM tm_don_hang_mua_xe_ct
        WHERE ma_phieu = $1 AND stt = $2
        RETURNING *
        `,
        [soPhieu, stt]
      );

      if (!result.rowCount) {
        throw { status: 404, message: "Chi tiết không tồn tại" };
      }

      await client.query(
        `
        UPDATE tm_don_hang_mua_xe
        SET tong_tien = (
          SELECT COALESCE(SUM(thanh_tien), 0)
          FROM tm_don_hang_mua_xe_ct
          WHERE ma_phieu = $1
        )
        WHERE so_phieu = $1
        `,
        [soPhieu]
      );

      return result.rows[0];
    });
  }

  /* =========================
   * 4. Gửi duyệt
   * ========================= */

  async submitDonHang(soPhieu, userId) {
    const result = await pool.query(
      `
      UPDATE tm_don_hang_mua_xe
      SET 
        trang_thai = $2,
        nguoi_gui = $3,
        ngay_gui = NOW()
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
   * 5. Duyệt / Từ chối
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
      `
      SELECT *
      FROM tm_don_hang_mua_xe_ct
      WHERE ma_phieu = $1
      ORDER BY stt
      `,
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

  /* =========================
   * 8. Nhập kho xe
   * ========================= */
  async nhapKhoXe(maPhieu, danhSachXe, userId) {
    const results = {
      success: [],
      errors: [],
    };

    // Kiểm tra trạng thái đơn hàng trước khi chạy loop để tiết kiệm resource
    const trangThai = await this._checkTrangThai(maPhieu, null, pool);
    if (trangThai !== TRANG_THAI.DA_DUYET) {
      throw {
        status: 400,
        message: "Đơn hàng phải được duyệt trước khi nhập kho",
      };
    }

    for (const item of danhSachXe) {
      try {
        const result = await VehicleService.nhapXeTuDonHang(
          maPhieu,
          item.id, // ID cua chi tiet don hang
          item, // Data chua so_khung, so_may
          userId
        );
        results.success.push({
          id: item.id,
          xe_key: result.data.xe_key,
        });
      } catch (err) {
        results.errors.push({
          id: item.id,
          message: err.message,
        });
      }
    }

    return results;
  }
  // Lấy chi tiết đơn hàng cho export
  async getAllDetails(filters = {}) {
    let sql = `
      SELECT 
        ct.*, 
        h.ngay_dat_hang as ngay_lap,
        h.ma_kho_nhap,
        h.ma_ncc,
        xl.ten_loai,
        m.ten_mau
      FROM tm_don_hang_mua_xe_ct ct
      INNER JOIN tm_don_hang_mua_xe h ON ct.ma_phieu = h.so_phieu
      LEFT JOIN tm_xe_loai xl ON ct.ma_loai_xe = xl.ma_loai
      LEFT JOIN sys_mau m ON ct.ma_mau = m.ma_mau
      WHERE 1=1
    `;
    const params = [];
    const result = await pool.query(sql, params);
    return result.rows;
  }
}

module.exports = new DonHangMuaXeService();
