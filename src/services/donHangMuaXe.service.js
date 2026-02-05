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
      `SELECT trang_thai FROM tm_don_hang 
       WHERE so_don_hang = $1 
          OR (CASE WHEN $1 ~ '^\\d+$' THEN id = $1::int ELSE FALSE END)`,
      [soPhieu],
    );

    if (!result.rows.length) {
      throw { status: 404, message: "Đơn hàng không tồn tại" };
    }

    // Map legacy status if needed or strict check
    // Note: GUI_DUYET is removed from new schema, mapping logic might be needed
    if (expectedStatus && result.rows[0].trang_thai !== expectedStatus) {
      // Allow DA_DUYET check if current is NHAP (simulated flow)
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
    FROM tm_don_hang
    WHERE so_don_hang = $1
    FOR UPDATE
    `,
      [soPhieu],
    );

    // 2. Tính STT an toàn
    const { rows } = await client.query(
      `
    SELECT COALESCE(MAX(stt), 0) + 1 AS next_stt
    FROM tm_don_hang_chi_tiet
    WHERE so_don_hang = $1
    `,
      [soPhieu],
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
        INSERT INTO tm_don_hang (
          so_don_hang,
          ngay_dat_hang,
          ma_ben_nhap,
          loai_ben_nhap,
          ma_ben_xuat,
          loai_ben_xuat,
          tong_gia_tri,
          trang_thai,
          nguoi_tao,
          loai_don_hang,
          created_at
        ) VALUES (
          $1,
          CURRENT_DATE,
          $2,
          'KHO',
          $3,
          'DOI_TAC',
          0,
          $4,
          $5,
          'MUA_XE',
          NOW()
        )
        RETURNING *
        `,
        [soPhieu, data.ma_kho_nhap, data.ma_ncc, TRANG_THAI.NHAP, userId],
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
        INSERT INTO tm_don_hang (
          so_don_hang,
          ngay_dat_hang,
          ma_ben_nhap,
          loai_ben_nhap,
          ma_ben_xuat,
          loai_ben_xuat,
          tong_gia_tri,
          trang_thai,
          nguoi_tao,
          loai_don_hang,
          created_at
        ) VALUES (
          $1,
          CURRENT_DATE,
          $2,
          'KHO',
          $3,
          'DOI_TAC',
          0,
          $4,
          $5,
          'MUA_XE',
          NOW()
        )
        RETURNING *
        `,
        [soPhieu, data.ma_kho_nhap, data.ma_ncc, TRANG_THAI.NHAP, userId],
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

        const yeuCauDacBiet = item.ma_mau
          ? JSON.stringify({ ma_mau: item.ma_mau })
          : "{}";

        // NOTE: thanh_tien is GENERATED STORED column in new schema, do not insert it
        const detailResult = await client.query(
          `
            INSERT INTO tm_don_hang_chi_tiet (
              so_don_hang,
              stt,
              ma_hang_hoa,
              yeu_cau_dac_biet,
              so_luong_dat,
              don_gia
            ) VALUES ($1,$2,$3,$4::jsonb,$5,$6)
            RETURNING *
            `,
          [
            soPhieu,
            stt,
            item.ma_loai_xe,
            yeuCauDacBiet,
            item.so_luong,
            item.don_gia,
          ],
        );

        chiTietResults.push(detailResult.rows[0]);
      }

      // 4. Update tong_tien in header
      await client.query(
        `
        UPDATE tm_don_hang
        SET tong_gia_tri = $2
        WHERE so_don_hang = $1
        `,
        [soPhieu, tongTien],
      );

      // 5. Return complete order with details
      return {
        ...header,
        tong_gia_tri: tongTien, // Update value for consistency
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

      const yeuCauDacBiet = data.ma_mau
        ? JSON.stringify({ ma_mau: data.ma_mau })
        : "{}";

      const result = await client.query(
        `
        INSERT INTO tm_don_hang_chi_tiet (
          so_don_hang,
          stt,
          ma_hang_hoa,
          yeu_cau_dac_biet,
          so_luong_dat,
          don_gia
        ) VALUES ($1,$2,$3,$4::jsonb,$5,$6)
        RETURNING *
        `,
        [
          soPhieu,
          stt,
          data.ma_loai_xe,
          yeuCauDacBiet,
          data.so_luong,
          data.don_gia,
        ],
      );

      // cập nhật tổng tiền header
      await client.query(
        `
        UPDATE tm_don_hang
        SET tong_gia_tri = (
          SELECT COALESCE(SUM(thanh_tien), 0)
          FROM tm_don_hang_chi_tiet
          WHERE so_don_hang = $1
        )
        WHERE so_don_hang = $1
        `,
        [soPhieu],
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
        DELETE FROM tm_don_hang_chi_tiet
        WHERE so_don_hang = $1 AND stt = $2
        RETURNING *
        `,
        [soPhieu, stt],
      );

      if (!result.rowCount) {
        throw { status: 404, message: "Chi tiết không tồn tại" };
      }

      await client.query(
        `
        UPDATE tm_don_hang
        SET tong_gia_tri = (
          SELECT COALESCE(SUM(thanh_tien), 0)
          FROM tm_don_hang_chi_tiet
          WHERE so_don_hang = $1
        )
        WHERE so_don_hang = $1
        `,
        [soPhieu],
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
      UPDATE tm_don_hang
      SET 
        trang_thai = $2::enum_trang_thai_don_hang,
        nguoi_gui = $4,
        ngay_gui = NOW(),
        nguoi_duyet = NULL, -- Reset approver if re-submitting
        ngay_duyet = NULL
      WHERE so_don_hang = $1
        AND trang_thai = $3::enum_trang_thai_don_hang
      RETURNING *
      `,
      [soPhieu, TRANG_THAI.GUI_DUYET, TRANG_THAI.NHAP, userId],
    );

    if (!result.rowCount) {
      throw {
        status: 400,
        message: "Không thể gửi duyệt đơn (Đơn phải ở trạng thái NHAP)",
      };
    }

    return result.rows[0];
  }

  /* =========================
   * 5. Duyệt / Từ chối
   * ========================= */

  async duyetDonHang(soPhieu, userId) {
    // Approve: GUI_DUYET -> DA_DUYET
    const result = await pool.query(
      `
      UPDATE tm_don_hang
      SET 
        trang_thai = $2::enum_trang_thai_don_hang,
        nguoi_duyet = $3,
        ngay_duyet = NOW()
      WHERE so_don_hang = $1
        AND trang_thai = $4::enum_trang_thai_don_hang
      RETURNING *
      `,
      [soPhieu, TRANG_THAI.DA_DUYET, userId, TRANG_THAI.GUI_DUYET],
    );

    if (!result.rowCount) {
      throw {
        status: 400,
        message: "Đơn chưa ở trạng thái chờ duyệt (GUI_DUYET)",
      };
    }

    return result.rows[0];
  }

  async tuChoiDonHang(soPhieu, userId, lyDo) {
    // Reject: GUI_DUYET -> DA_HUY
    const result = await pool.query(
      `
      UPDATE tm_don_hang
      SET 
        trang_thai = $2::enum_trang_thai_don_hang,
        nguoi_duyet = $3,
        ngay_duyet = NOW(),
        ghi_chu = $4
      WHERE so_don_hang = $1
        AND trang_thai = $5::enum_trang_thai_don_hang
      RETURNING *
      `,
      [soPhieu, TRANG_THAI.DA_HUY, userId, lyDo, TRANG_THAI.GUI_DUYET],
    );

    if (!result.rowCount) {
      throw { status: 400, message: "Đơn không ở trạng thái chờ duyệt" };
    }

    return result.rows[0];
  }

  async deleteChiTietById(soPhieu, id) {
    await this._checkTrangThai(soPhieu, TRANG_THAI.NHAP, pool);

    const result = await pool.query(
      `
      DELETE FROM tm_don_hang_chi_tiet
      WHERE so_don_hang = $1 AND id = $2
      RETURNING *
      `,
      [soPhieu, id],
    );

    if (!result.rowCount) {
      throw { status: 404, message: "Chi tiết không tồn tại" };
    }

    return result.rows[0];
  }

  /* =========================
   * 6. Lấy chi tiết đơn
   * ========================= */

  /* =========================
   * 6. Lấy chi tiết đơn
   * ========================= */

  async getDetail(soPhieu) {
    // 1. Get Header (Aliases to match user requested format)
    const header = await pool.query(
      `
      SELECT 
        h.id,
        h.so_don_hang as so_phieu,
        h.ngay_dat_hang,
        h.ma_ben_nhap as ma_kho_nhap,
        k.ten_kho,
        h.ma_ben_xuat as ma_ncc,
        dt.ten_doi_tac as ten_ncc,
        h.tong_gia_tri as tong_tien,
        h.trang_thai,
        h.created_at as ngay_tao,
        u_tao.ho_ten as ten_nguoi_tao,
        h.nguoi_tao,
        h.ngay_gui as ngay_gui_duyet,
        u_gui.ho_ten as ten_nguoi_gui,
        h.nguoi_gui,
        h.ngay_duyet,
        u_duyet.ho_ten as ten_nguoi_duyet,
        h.nguoi_duyet,
        h.ghi_chu as dien_giai,
        h.ghi_chu -- duplicate for note field
      FROM tm_don_hang h
      LEFT JOIN sys_kho k ON h.ma_ben_nhap = k.ma_kho
      LEFT JOIN dm_doi_tac dt ON h.ma_ben_xuat = dt.ma_doi_tac
      LEFT JOIN sys_user u_tao ON (CASE WHEN h.nguoi_tao ~ '^[0-9]+$' THEN h.nguoi_tao::integer ELSE NULL END) = u_tao.id
      LEFT JOIN sys_user u_gui ON h.nguoi_gui = u_gui.id
      LEFT JOIN sys_user u_duyet ON (CASE WHEN h.nguoi_duyet ~ '^[0-9]+$' THEN h.nguoi_duyet::integer ELSE NULL END) = u_duyet.id
      WHERE h.so_don_hang = $1 
         OR (CASE WHEN $1 ~ '^\\d+$' THEN h.id = $1::int ELSE FALSE END)
      `,
      [soPhieu],
    );

    if (!header.rows.length) {
      throw { status: 404, message: "Đơn hàng không tồn tại" };
    }

    const soPhieuDB = header.rows[0].so_phieu; // This is actually so_don_hang from SELECT

    // 2. Get Details (Join with product and color master data)
    const details = await pool.query(
      `
      SELECT 
        d.id,
        d.so_don_hang as ma_phieu,
        d.stt,
        d.ma_hang_hoa as ma_loai_xe,
        h.ten_hang_hoa as ten_loai_xe,
        d.yeu_cau_dac_biet->>'ma_mau' as ma_mau,
        m.ten_mau,
        d.so_luong_dat as so_luong,
        d.don_gia,
        COALESCE(d.thanh_tien, d.so_luong_dat * d.don_gia) as thanh_tien,
        d.so_luong_da_giao,
        (d.so_luong_dat - d.so_luong_da_giao) as so_luong_con_lai,
        CASE 
          WHEN d.so_luong_da_giao >= d.so_luong_dat THEN 'Đã nhập'
          WHEN d.so_luong_da_giao > 0 THEN 'Đang nhập'
          ELSE 'Chưa nhập'
        END as trang_thai_nhap_kho
      FROM tm_don_hang_chi_tiet d
      LEFT JOIN tm_hang_hoa h ON d.ma_hang_hoa = h.ma_hang_hoa
      LEFT JOIN dm_mau m ON d.yeu_cau_dac_biet->>'ma_mau' = m.ma_mau
      WHERE d.so_don_hang = $1
      ORDER BY d.stt
      `,
      [soPhieuDB],
    );

    // 3. Get Received Vehicles (Chi tiết xe đã nhập)
    const serialsRes = await pool.query(
      `
      SELECT 
        s.ma_hang_hoa as ma_loai_xe,
        s.ma_serial as ma_xe,
        s.serial_identifier as so_khung,
        s.thuoc_tinh_rieng->>'so_may' as so_may,
        s.ngay_nhap_kho,
        s.trang_thai
      FROM tm_hang_hoa_lich_su ls
      JOIN tm_hang_hoa_serial s ON ls.ma_serial = s.ma_serial
      WHERE ls.so_chung_tu = $1 
        AND ls.loai_giao_dich = 'NHAP_KHO'
      `,
      [soPhieuDB],
    );

    const serials = serialsRes.rows;

    const detailsWithSerials = details.rows.map((d) => {
      // Filter serials matching this product type
      // Note: Ideally we match by detail ID, but ls doesn't store detail ID clearly.
      // Matching by Product Code is generally sufficient for PO display.
      const relatedSerials = serials.filter(
        (s) => s.ma_loai_xe === d.ma_loai_xe,
      );

      return {
        ...d,
        danh_sach_xe: relatedSerials,
      };
    });

    return {
      ...header.rows[0],
      chi_tiet: detailsWithSerials,
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

    const conditions = ["loai_don_hang = 'MUA_XE'"];
    const values = [];
    let idx = 1;

    if (trang_thai) {
      conditions.push(`trang_thai = $${idx++}`);
      values.push(trang_thai);
    }

    if (ma_kho_nhap) {
      conditions.push(`ma_ben_nhap = $${idx++}`);
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
        so_don_hang ILIKE $${idx}
        OR ma_ben_xuat ILIKE $${idx}
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
      SELECT 
        id,
        so_don_hang as so_phieu,
        ngay_dat_hang,
        ma_ben_nhap as ma_kho_nhap,
        ma_ben_xuat as ma_ncc,
        tong_gia_tri as tong_tien,
        trang_thai,
        created_at,
        ghi_chu as dien_giai
      FROM tm_don_hang
      ${whereClause}
      ORDER BY ngay_dat_hang DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM tm_don_hang
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
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Get current status and standard ID
      const orderRes = await client.query(
        `SELECT id, so_don_hang, trang_thai, ma_ben_nhap, ma_ben_xuat 
         FROM tm_don_hang 
         WHERE so_don_hang = $1 OR (CASE WHEN $1 ~ '^\\d+$' THEN id = $1::int ELSE FALSE END)
         FOR UPDATE`,
        [maPhieu],
      );

      if (!orderRes.rows.length) {
        throw { status: 404, message: "Đơn hàng không tồn tại" };
      }

      const order = orderRes.rows[0];
      const so_don_hang = order.so_don_hang;

      // Allow Approved or Partially Receiving
      const validStatuses = ["DA_DUYET", "DANG_NHAP_KHO"];
      if (!validStatuses.includes(order.trang_thai)) {
        throw {
          status: 400,
          message: `Đơn hàng phải ở trạng thái ĐÃ DUYỆT hoặc ĐANG NHẬP KHO. Trạng thái hiện tại: ${order.trang_thai}`,
        };
      }

      // 2. Sinh mã phiếu nhập kho (Hóa đơn mua)
      const { rows: hdRows } = await client.query(
        `SELECT 'PNK' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_hd')::text, 6, '0') as inv_no`,
      );
      const soPhieuNhapKho = hdRows[0].inv_no;

      const results = {
        success: [],
        errors: [],
        so_phieu_nhap: soPhieuNhapKho,
      };

      let tongTienHienTai = 0;
      let itemsProcessed = 0;

      // 3. Process items using internal client to maintain transaction
      for (const item of danhSachXe) {
        try {
          // Note: Passing 'client' to ensure it runs within same transaction
          // We need to modify nhapXeTuDonHang to accept client or use internal logic
          const result = await VehicleService.nhapXeTuDonHang(
            so_don_hang,
            item.id,
            item,
            userId,
            client,
          );

          const giaNhap = Number(item.gia_nhap || result.data.gia_nhap || 0);
          tongTienHienTai += giaNhap;

          // Create Invoice Detail
          await client.query(
            `INSERT INTO tm_hoa_don_chi_tiet (
              so_hoa_don, stt, ma_hang_hoa, ma_serial, so_luong, don_gia, thanh_tien
            ) VALUES ($1, $2, $3, $4, 1, $5, $5)`,
            [
              soPhieuNhapKho,
              ++itemsProcessed,
              result.data.ma_loai_xe,
              result.data.xe_key,
              giaNhap,
            ],
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

      if (itemsProcessed === 0) {
        throw new Error("Không có xe nào được nhập thành công");
      }

      // 4. Tạo Header Hóa đơn (tm_hoa_don)
      await client.query(
        `INSERT INTO tm_hoa_don (
          so_hoa_don, loai_hoa_don, so_don_hang, ngay_hoa_don,
          ma_ben_xuat, loai_ben_xuat, ma_ben_nhap, loai_ben_nhap,
          tong_tien, thanh_tien, trang_thai, nguoi_lap
        ) VALUES ($1, 'MUA_HANG', $2, CURRENT_DATE, $3, 'DOI_TAC', $4, 'KHO', $5, $5, 'DA_THANH_TOAN', $6)`,
        [
          soPhieuNhapKho,
          so_don_hang,
          order.ma_ben_xuat, // NCC
          order.ma_ben_nhap, // Kho nhập
          tongTienHienTai,
          userId,
        ],
      );

      // 5. Ghi nhận công nợ (SỬ DỤNG MÃ HÓA ĐƠN)
      await CongNoService.recordDoiTacDebt(client, {
        ma_doi_tac: order.ma_ben_xuat,
        loai_cong_no: "PHAI_TRA",
        so_hoa_don: soPhieuNhapKho,
        ngay_phat_sinh: new Date(),
        so_tien: tongTienHienTai,
        ghi_chu: `Nhập ${itemsProcessed} xe theo phiếu ${soPhieuNhapKho} (Đơn: ${so_don_hang})`,
      });

      // 6. Post-process Status Update
      const checkRes = await client.query(
        `SELECT 
          COUNT(*) as total_items,
          SUM(so_luong_dat) as total_qty,
          SUM(so_luong_da_giao) as total_delivered
         FROM tm_don_hang_chi_tiet
         WHERE so_don_hang = $1`,
        [so_don_hang],
      );

      const { total_qty, total_delivered } = checkRes.rows[0];

      let newStatus = order.trang_thai;
      if (
        Number(total_delivered) >= Number(total_qty) &&
        Number(total_qty) > 0
      ) {
        newStatus = "HOAN_THANH";
      } else if (Number(total_delivered) > 0) {
        newStatus = "DANG_NHAP_KHO";
      }

      if (newStatus !== order.trang_thai) {
        await client.query(
          `UPDATE tm_don_hang SET trang_thai = $1, updated_at = NOW() WHERE so_don_hang = $2`,
          [newStatus, so_don_hang],
        );
      }

      await client.query("COMMIT");
      return results;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  // Lấy chi tiết đơn hàng cho export
  async getAllDetails(filters = {}) {
    let sql = `
      SELECT 
        ct.*, 
        ct.so_don_hang as ma_phieu,
        h.ngay_dat_hang as ngay_lap,
        h.ma_ben_nhap as ma_kho_nhap,
        h.ma_ben_xuat as ma_ncc,
        hh.ten_hang_hoa as ten_loai,
        m.ten_mau,
        ct.ma_hang_hoa as ma_loai_xe,
        ct.so_luong_dat as so_luong
      FROM tm_don_hang_chi_tiet ct
      INNER JOIN tm_don_hang h ON ct.so_don_hang = h.so_don_hang
      LEFT JOIN tm_hang_hoa hh ON ct.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN dm_mau m ON (ct.yeu_cau_dac_biet->>'ma_mau') = m.ma_mau
      WHERE 1=1
    `;
    const params = [];
    const result = await pool.query(sql, params);
    return result.rows;
  }
}

module.exports = new DonHangMuaXeService();
