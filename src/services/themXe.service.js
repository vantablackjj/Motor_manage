const { pool } = require("../config/database");
const CongNoService = require("./congNo.service");

class VehicleService {
  /**
   * ✅ Tạo mã xe_key - ĐÃ KHẮC PHỤC race condition
   * Sử dụng advisory lock để tránh trùng lặp trong concurrent requests
   */
  async generateXeKey(client) {
    // Lock để tránh race condition khi nhiều request cùng lúc
    await client.query("SELECT pg_advisory_xact_lock(123456)");

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, 8);

    const result = await client.query(
      `
      SELECT COALESCE(
        MAX(CAST(SUBSTRING(ma_serial, 12) AS INTEGER)),
        0
      ) + 1 AS next_num
      FROM tm_hang_hoa_serial
      WHERE ma_serial LIKE $1
      `,
      [`XE${timestamp}_%`],
    );

    const nextNum = String(result.rows[0].next_num).padStart(6, "0");
    return `XE${timestamp}_${nextNum}`;
  }

  /**
   * ✅ Kiểm tra trùng số khung / số máy - ĐÃ TỐI ƯU
   */
  async checkDuplicate(soKhung, soMay, excludeId = null, client = null) {
    const db = client || pool;
    const params = [soKhung, soMay];
    let sql = `
      SELECT serial_identifier as so_khung, (thuoc_tinh_rieng->>'so_may') as so_may, ma_serial as xe_key
      FROM tm_hang_hoa_serial
      WHERE locked = false
        AND (serial_identifier = $1 OR (thuoc_tinh_rieng->>'so_may') = $2)
    `;

    if (excludeId) {
      sql += ` AND id != $3`;
      params.push(excludeId);
    }

    const result = await db.query(sql, params);
    const errors = [];

    for (const row of result.rows) {
      if (row.so_khung === soKhung) {
        errors.push({
          field: "so_khung",
          message: `Số khung đã tồn tại (${row.xe_key})`,
        });
      }
      if (row.so_may === soMay) {
        errors.push({
          field: "so_may",
          message: `Số máy đã tồn tại (${row.xe_key})`,
        });
      }
    }

    return errors;
  }

  /**
   * ✅ NHẬP XE MỚI - ĐÃ CẢI TIẾN
   */
  async nhapXeMoi(data, userId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Validation cơ bản
      if (
        !data.so_khung ||
        !data.so_may ||
        !data.ma_loai_xe ||
        !data.ma_kho_hien_tai
      ) {
        throw {
          status: 400,
          message: "Thiếu thông tin bắt buộc",
          errors: [
            {
              field: "required",
              message: "Số khung, số máy, loại xe và kho là bắt buộc",
            },
          ],
        };
      }

      // 2. Check duplicate
      const duplicateErrors = await this.checkDuplicate(
        data.so_khung.trim().toUpperCase(),
        data.so_may.trim().toUpperCase(),
        null,
        client,
      );

      if (duplicateErrors.length) {
        throw {
          status: 409,
          message: "Dữ liệu trùng lặp",
          errors: duplicateErrors,
        };
      }

      // 3. Check loại xe (tm_hang_hoa)
      const loaiXeRes = await client.query(
        `
        SELECT ma_hang_hoa as ma_loai, ten_hang_hoa as ten_loai, gia_von_mac_dinh AS gia_mac_dinh
        FROM tm_hang_hoa
        WHERE ma_hang_hoa = $1 AND loai_quan_ly = 'SERIAL' AND status = true
        `,
        [data.ma_loai_xe],
      );

      if (!loaiXeRes.rows.length) {
        throw { status: 404, message: "Loại xe không tồn tại" };
      }

      // 4. Check kho
      const khoRes = await client.query(
        `
        SELECT ma_kho, ten_kho
        FROM sys_kho
        WHERE ma_kho = $1 AND status = true
        `,
        [data.ma_kho_hien_tai],
      );

      if (!khoRes.rows.length) {
        throw { status: 404, message: "Kho không tồn tại" };
      }

      // 5. Check màu (dm_xe_mau & dm_mau) - Optional validation
      if (data.ma_mau) {
        // First check if color exists in dm_mau
        const mauExistsRes = await client.query(
          `SELECT 1 FROM dm_mau WHERE ma_mau = $1 AND status = true`,
          [data.ma_mau],
        );

        if (!mauExistsRes.rows.length) {
          throw {
            status: 404,
            message: "Màu không tồn tại trong hệ thống",
          };
        }

        // Optional: Check if color is assigned to this vehicle type
        // If not assigned, we'll still allow it (just log a warning)
        const mauRes = await client.query(
          `
          SELECT 1
          FROM dm_xe_mau xm
          WHERE xm.ma_loai_xe = $1 
            AND xm.ma_mau = $2 
            AND xm.status = true
          `,
          [data.ma_loai_xe, data.ma_mau],
        );

        // If color not assigned to vehicle type, auto-assign it
        if (!mauRes.rows.length) {
          await client.query(
            `INSERT INTO dm_xe_mau (ma_loai_xe, ma_mau, status, created_at)
             VALUES ($1, $2, true, NOW())
             ON CONFLICT (ma_loai_xe, ma_mau) DO UPDATE SET status = true`,
            [data.ma_loai_xe, data.ma_mau],
          );
        }
      }

      // 6. Validate giá nhập
      const giaNhap = data.gia_nhap || loaiXeRes.rows[0].gia_mac_dinh;
      if (!giaNhap || giaNhap <= 0) {
        throw {
          status: 400,
          message: "Giá nhập phải lớn hơn 0",
          errors: [{ field: "gia_nhap", message: "Giá nhập không hợp lệ" }],
        };
      }

      // 7. Validate ngày nhập
      const ngayNhap = data.ngay_nhap || new Date().toISOString().split("T")[0];

      // 8. Tạo xe_key với lock
      const xeKey = await this.generateXeKey(client);

      // 9. Insert xe (tm_hang_hoa_serial)
      const xeResult = await client.query(
        `
        INSERT INTO tm_hang_hoa_serial (
          ma_serial, ma_hang_hoa, serial_identifier,
          ma_kho_hien_tai, ngay_nhap_kho, 
          gia_von, trang_thai,
          locked, ghi_chu,
          thuoc_tinh_rieng,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,false,$8,$9,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *
        `,
        [
          xeKey,
          data.ma_loai_xe,
          data.so_khung.trim().toUpperCase(),
          data.ma_kho_hien_tai,
          ngayNhap,
          giaNhap,
          "TON_KHO",
          data.ghi_chu || null,
          JSON.stringify({
            so_may: data.so_may.trim().toUpperCase(),
            ma_mau: data.ma_mau || null,
          }),
        ],
      );

      // 10. Ghi lịch sử
      await client.query(
        `
        INSERT INTO tm_hang_hoa_lich_su (
          ma_serial, ma_hang_hoa, loai_giao_dich,
          ngay_giao_dich, ma_kho_nhap,
          don_gia, nguoi_thuc_hien, dien_giai
        ) VALUES ($1,$2,'NHAP_KHO',$3,$4,$5,$6,$7)
        `,
        [
          xeKey,
          data.ma_loai_xe,
          ngayNhap,
          data.ma_kho_hien_tai,
          giaNhap,
          userId,
          `Nhập kho xe ${loaiXeRes.rows[0].ten_loai} - ${data.so_khung
            .trim()
            .toUpperCase()}`,
        ],
      );

      await client.query("COMMIT");

      const fullData = await this.getXeDetail(xeKey);
      return {
        success: true,
        data: fullData,
        message: "Nhập xe thành công",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async nhapXeTuDonHang(maPhieu, chiTietId, data, userId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /* =====================================================
       * 1. Lấy chi tiết đơn hàng + đơn hàng (CÓ LOCK)
       * ===================================================== */
      const ctRes = await client.query(
        `
      SELECT 
        ct.id,
        ct.so_don_hang as ma_phieu,
        ct.stt,
        ct.ma_hang_hoa as ma_loai_xe,
        ct.yeu_cau_dac_biet->>'ma_mau' as ma_mau,
        ct.don_gia,
        ct.so_luong_dat as so_luong,
        ct.so_luong_da_giao,

        dh.so_don_hang as so_phieu,
        dh.ma_ben_nhap as ma_kho_nhap,
        dh.trang_thai,

        xl.ten_hang_hoa as ten_loai
      FROM tm_don_hang_chi_tiet ct
      JOIN tm_don_hang dh
        ON ct.so_don_hang = dh.so_don_hang
      JOIN tm_hang_hoa xl
        ON ct.ma_hang_hoa = xl.ma_hang_hoa
      WHERE (dh.so_don_hang = $1 OR (CASE WHEN $1 ~ '^\\d+$' THEN dh.id = $1::int ELSE FALSE END))
        AND ct.id = $2
      FOR UPDATE OF ct
    `,
        [maPhieu, chiTietId],
      );

      if (ctRes.rowCount === 0) {
        throw {
          status: 404,
          message: "Chi tiết đơn hàng không tồn tại",
        };
      }

      let chiTiet = ctRes.rows[0];

      // New logic: Check quantity received instead of splitting rows
      if (chiTiet.so_luong_da_giao >= chiTiet.so_luong) {
        throw {
          status: 400,
          message: "Chi tiết này đã nhập đủ số lượng",
        };
      }

      if (chiTiet.trang_thai !== "DA_DUYET") {
        throw {
          status: 400,
          message: `Đơn hàng chưa được duyệt. Trạng thái hiện tại: ${chiTiet.trang_thai}`,
        };
      }

      const so_khung = data.so_khung || data.soKhung;
      const so_may = data.so_may || data.soMay;

      if (!so_khung || !so_may) {
        throw {
          status: 400,
          message: "Thiếu số khung hoặc số máy",
          errors: [
            { field: "so_khung", message: "Số khung là bắt buộc" },
            { field: "so_may", message: "Số máy là bắt buộc" },
          ],
        };
      }

      const soKhung = so_khung.trim().toUpperCase();
      const soMay = so_may.trim().toUpperCase();

      const dupErrors = await this.checkDuplicate(soKhung, soMay, null, client);

      if (dupErrors.length > 0) {
        throw {
          status: 409,
          message: "Số khung hoặc số máy đã tồn tại",
          errors: dupErrors,
        };
      }

      const xeKey = await this.generateXeKey(client);
      const giaNhap = data.gia_nhap || chiTiet.don_gia;
      const ngayNhap = data.ngay_nhap || new Date().toISOString().split("T")[0];
      const maMau = data.ma_mau || chiTiet.ma_mau;

      await client.query(
        `
      INSERT INTO tm_hang_hoa_serial (
        ma_serial, ma_hang_hoa, serial_identifier,
        ma_kho_hien_tai, ngay_nhap_kho, 
        gia_von, trang_thai, locked,
        ghi_chu, thuoc_tinh_rieng,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,'TON_KHO',false,$7,$8,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `,
        [
          xeKey,
          chiTiet.ma_loai_xe,
          soKhung,
          chiTiet.ma_kho_nhap,
          ngayNhap,
          giaNhap,
          `Nhập từ đơn hàng ${chiTiet.so_phieu} (CT#${chiTiet.id})`,
          JSON.stringify({ so_may: soMay, ma_mau: maMau }),
        ],
      );

      // Update quantity delivered
      await client.query(
        `
      UPDATE tm_don_hang_chi_tiet
      SET 
        so_luong_da_giao = so_luong_da_giao + 1
      WHERE id = $1
    `,
        [chiTiet.id],
      );

      await client.query(
        `
      INSERT INTO tm_hang_hoa_lich_su (
        ma_serial, ma_hang_hoa, loai_giao_dich, so_chung_tu,
        ngay_giao_dich, ma_kho_nhap,
        don_gia, nguoi_thuc_hien, dien_giai
      ) VALUES (
        $1,$2,'NHAP_KHO',$3,
        $4,$5,
        $6,$7,$8
      )
    `,
        [
          xeKey,
          chiTiet.ma_loai_xe,
          chiTiet.so_phieu,
          ngayNhap,
          chiTiet.ma_kho_nhap,
          giaNhap,
          userId,
          `Nhập xe ${chiTiet.ten_loai} từ đơn hàng ${chiTiet.so_phieu}`,
        ],
      );

      /* =====================================================
       * 4. Ghi nhận công nợ đối tác (PHẢI TRẢ)
       * ===================================================== */
      const dhRes = await client.query(
        "SELECT ma_ben_xuat as ma_ncc FROM tm_don_hang WHERE so_don_hang = $1",
        [chiTiet.so_phieu],
      );

      if (dhRes.rows.length) {
        await CongNoService.recordDoiTacDebt(client, {
          ma_doi_tac: dhRes.rows[0].ma_ncc,
          loai_cong_no: "PHAI_TRA",
          so_hoa_don: chiTiet.so_phieu,
          ngay_phat_sinh: ngayNhap,
          so_tien: giaNhap,
          ghi_chu: `Nhập xe ${chiTiet.ma_loai_xe} (Khung: ${soKhung}) từ đơn ${chiTiet.so_phieu}`,
        });
      }

      await client.query("COMMIT");

      return {
        success: true,
        message: "Nhập xe từ đơn hàng thành công",
        data: await this.getXeDetail(xeKey),
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getXeDetail(xeKey) {
    const result = await pool.query(
      `
    SELECT 
      x.ma_serial as xe_key,
      x.ma_hang_hoa as ma_loai_xe,
      xl.ten_hang_hoa as ten_loai,
      x.thuoc_tinh_rieng->>'ma_mau' as ma_mau,
      m.ten_mau,
      x.serial_identifier as so_khung,
      x.thuoc_tinh_rieng->>'so_may' as so_may,
      x.ma_kho_hien_tai,
      k.ten_kho,
      x.ngay_nhap_kho as ngay_nhap,
      x.gia_von as gia_nhap,
      x.trang_thai,
      x.created_at
    FROM tm_hang_hoa_serial x
    LEFT JOIN tm_hang_hoa xl ON x.ma_hang_hoa = xl.ma_hang_hoa
    LEFT JOIN dm_mau m ON x.thuoc_tinh_rieng->>'ma_mau' = m.ma_mau
    LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
    WHERE x.ma_serial = $1
  `,
      [xeKey],
    );

    return result.rows[0] || null;
  }

  /**
   * ✅ Lấy lịch sử giao dịch xe
   */
  async getXeHistory(xeKey) {
    const result = await pool.query(
      `
      SELECT 
        ls.*,
        k_xuat.ten_kho as ten_kho_xuat,
        k_nhap.ten_kho as ten_kho_nhap
      FROM tm_hang_hoa_lich_su ls
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      WHERE ls.ma_serial = $1
      ORDER BY ls.ngay_giao_dich DESC
    `,
      [xeKey],
    );

    return result.rows;
  }

  /**
   * ✅ Lấy danh sách xe trong kho
   */
  async getXeInKho(maKho, filters = {}) {
    const conditions = ["x.ma_kho_hien_tai = $1", "x.locked = false"];
    const params = [maKho];
    let paramIndex = 2;

    if (filters.trang_thai) {
      conditions.push(`x.trang_thai = $${paramIndex}`);
      params.push(filters.trang_thai);
      paramIndex++;
    }

    if (filters.ma_loai_xe) {
      conditions.push(`x.ma_hang_hoa = $${paramIndex}`);
      params.push(filters.ma_loai_xe);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(
        x.serial_identifier ILIKE $${paramIndex} 
        OR x.thuoc_tinh_rieng->>'so_may' ILIKE $${paramIndex} 
        OR xl.ten_hang_hoa ILIKE $${paramIndex}
        OR x.ma_serial ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const query = `
      SELECT 
        x.ma_serial as xe_key, x.ma_hang_hoa as ma_loai_xe, x.serial_identifier as so_khung,
        x.thuoc_tinh_rieng->>'so_may' as so_may, x.gia_von as gia_nhap, x.trang_thai,
        x.ngay_nhap_kho as ngay_nhap,
        xl.ten_hang_hoa as ten_loai, xl.ma_nhom_hang as ma_nh,
        nh.ten_nhom as ten_nh,
        m.ten_mau,
        k.ten_kho
      FROM tm_hang_hoa_serial x
      INNER JOIN tm_hang_hoa xl ON x.ma_hang_hoa = xl.ma_hang_hoa
      LEFT JOIN dm_nhom_hang nh ON xl.ma_nhom_hang = nh.ma_nhom
      LEFT JOIN dm_mau m ON x.thuoc_tinh_rieng->>'ma_mau' = m.ma_mau
      INNER JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE ${conditions.join(" AND ")}
      ORDER BY x.ngay_nhap_kho DESC
      LIMIT ${Math.min(parseInt(filters.limit) || 50, 100)}
      OFFSET ${parseInt(filters.offset) || 0}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * ✅ Đếm tổng số xe trong kho
   */
  async countXeInKho(maKho, filters = {}) {
    const conditions = ["ma_kho_hien_tai = $1", "locked = false"];
    const params = [maKho];
    let paramIndex = 2;

    if (filters.trang_thai) {
      conditions.push(`trang_thai = $${paramIndex}`);
      params.push(filters.trang_thai);
      paramIndex++;
    }

    if (filters.ma_loai_xe) {
      conditions.push(`ma_hang_hoa = $${paramIndex}`);
      params.push(filters.ma_loai_xe);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT COUNT(*) as total FROM tm_hang_hoa_serial WHERE ${conditions.join(
        " AND ",
      )}`,
      params,
    );

    return parseInt(result.rows[0].total);
  }
}

module.exports = new VehicleService();
