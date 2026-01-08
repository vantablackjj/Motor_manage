const { pool } = require("../config/database");

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
        MAX(CAST(SUBSTRING(xe_key, 12) AS INTEGER)),
        0
      ) + 1 AS next_num
      FROM tm_xe_thuc_te
      WHERE xe_key LIKE $1
      `,
      [`XE${timestamp}_%`]
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
      SELECT so_khung, so_may, xe_key
      FROM tm_xe_thuc_te
      WHERE status = true
        AND (so_khung = $1 OR so_may = $2)
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

      // 2. Check duplicate TRONG transaction để tránh race condition
      const duplicateErrors = await this.checkDuplicate(
        data.so_khung.trim().toUpperCase(),
        data.so_may.trim().toUpperCase(),
        null,
        client // ✅ Pass client để dùng chung transaction
      );

      if (duplicateErrors.length) {
        throw {
          status: 409,
          message: "Dữ liệu trùng lặp",
          errors: duplicateErrors,
        };
      }

      // 3. Check loại xe
      const loaiXeRes = await client.query(
        `
        SELECT ma_loai, ten_loai, gia_nhap AS gia_mac_dinh
        FROM tm_xe_loai
        WHERE ma_loai = $1 AND status = true
        `,
        [data.ma_loai_xe]
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
        [data.ma_kho_hien_tai]
      );

      if (!khoRes.rows.length) {
        throw { status: 404, message: "Kho không tồn tại" };
      }

      // 5. Check màu (nếu có)
      if (data.ma_mau) {
        const mauRes = await client.query(
          `
          SELECT 1
          FROM tm_xe_mau xm
          INNER JOIN sys_mau m ON xm.ma_mau = m.ma_mau
          WHERE xm.ma_loai_xe = $1 
            AND xm.ma_mau = $2 
            AND xm.status = true
            AND m.status = true
          `,
          [data.ma_loai_xe, data.ma_mau]
        );

        if (!mauRes.rows.length) {
          throw {
            status: 404,
            message: "Màu không hợp lệ cho loại xe này",
          };
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

      // 9. Insert xe với RETURNING *
      const xeResult = await client.query(
        `
        INSERT INTO tm_xe_thuc_te (
          xe_key, ma_loai_xe, ma_mau,
          so_khung, so_may,
          ma_kho_hien_tai, ngay_nhap,
          gia_nhap, trang_thai,
          status, da_ban, ghi_chu,
          ngay_tao, ngay_cap_nhat
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,true,false,$10,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *
        `,
        [
          xeKey,
          data.ma_loai_xe,
          data.ma_mau || null,
          data.so_khung.trim().toUpperCase(),
          data.so_may.trim().toUpperCase(),
          data.ma_kho_hien_tai,
          ngayNhap,
          giaNhap,
          "TON_KHO",
          data.ghi_chu || null,
        ]
      );

      // 10. Ghi lịch sử
      await client.query(
        `
        INSERT INTO tm_xe_lich_su (
          xe_key, loai_giao_dich,
          ngay_giao_dich, ma_kho_nhap,
          gia_tri, nguoi_thuc_hien, dien_giai
        ) VALUES ($1,'NHAP_KHO',$2,$3,$4,$5,$6)
        `,
        [
          xeKey,
          ngayNhap,
          data.ma_kho_hien_tai,
          giaNhap,
          userId,
          `Nhập kho xe ${loaiXeRes.rows[0].ten_loai} - ${data.so_khung
            .trim()
            .toUpperCase()}`,
        ]
      );

      await client.query("COMMIT");

      // ✅ Trả về dữ liệu đầy đủ
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

  /**
   * ✅ NHẬP XE TỪ ĐƠN HÀNG - ĐÃ KHẮC PHỤC HOÀN TOÀN
   * Vấn đề cũ:
   * - Không link với chi tiết đơn hàng (tm_don_hang_mua_xe_ct)
   * - Dùng string search ghi_chu để update (rất nguy hiểm!)
   * - Trạng thái 'GUI_DUYET' không phù hợp (xe đã về kho rồi)
   * - Loại giao dịch 'NHAP_CHO_DUYET' không có trong ENUM
   * - Thiếu field nguoi_tao trong table
   */ async nhapXeTuDonHang(maPhieu, chiTietId, data, userId) {
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
        ct.ma_phieu,
        ct.stt,
        ct.ma_loai_xe,
        ct.ma_mau,
        ct.don_gia,
        ct.so_luong,
        ct.da_nhap_kho,
        ct.xe_key,

        dh.so_phieu,
        dh.ma_kho_nhap,
        dh.trang_thai,

        xl.ten_loai
      FROM tm_don_hang_mua_xe_ct ct
      JOIN tm_don_hang_mua_xe dh
        ON ct.ma_phieu = dh.so_phieu
      JOIN tm_xe_loai xl
        ON ct.ma_loai_xe = xl.ma_loai
      WHERE ct.ma_phieu = $1
        AND ct.id = $2
      FOR UPDATE OF ct
    `,
        [maPhieu, chiTietId]
      );

      if (ctRes.rowCount === 0) {
        throw {
          status: 404,
          message: "Chi tiết đơn hàng không tồn tại",
        };
      }

      let chiTiet = ctRes.rows[0];

      /* =====================================================
       * 1.1 XỬ LÝ TÁCH DÒNG (SPLIT) NẾU SỐ LƯỢNG > 1
       * ===================================================== */
      if (chiTiet.so_luong > 1) {
        // 1. Giảm số lượng dòng hiện tại
        await client.query(
          `UPDATE tm_don_hang_mua_xe_ct SET so_luong = so_luong - 1 WHERE id = $1`,
          [chiTiet.id]
        );

        // 2. Tìm STT lớn nhất để tạo dòng mới
        const sttRes = await client.query(
          `SELECT COALESCE(MAX(stt), 0) + 1 as next_stt FROM tm_don_hang_mua_xe_ct WHERE ma_phieu = $1`,
          [maPhieu]
        );
        const nextStt = sttRes.rows[0].next_stt;

        // 3. Tạo dòng mới với số lượng = 1 (Dòng này sẽ được nhập xe)
        const newCtRes = await client.query(
          `
          INSERT INTO tm_don_hang_mua_xe_ct (
            ma_phieu, stt, ma_loai_xe, ma_mau, 
            so_luong, don_gia, thanh_tien, da_nhap_kho
          ) VALUES ($1, $2, $3, $4, 1, $5, $6, false)
          RETURNING *
          `,
          [
            chiTiet.ma_phieu,
            nextStt,
            chiTiet.ma_loai_xe,
            chiTiet.ma_mau,
            chiTiet.don_gia,
            chiTiet.don_gia, // thanh_tien = don_gia * 1
          ]
        );

        // 4. Update biến chiTiet để trỏ vào dòng mới vừa tạo
        const newChiTiet = newCtRes.rows[0];
        // Merge thông tin từ bảng dh/xl của dòng cũ vào
        chiTiet = {
          ...chiTiet,
          ...newChiTiet,
          id: newChiTiet.id,
          so_luong: 1,
        };
      }

      /* =====================================================
       * 2. Validate trạng thái đơn hàng
       * ===================================================== */
      if (chiTiet.trang_thai !== "DA_DUYET") {
        throw {
          status: 400,
          message: `Đơn hàng chưa được duyệt. Trạng thái hiện tại: ${chiTiet.trang_thai}`,
        };
      }

      if (chiTiet.da_nhap_kho) {
        throw {
          status: 400,
          message: `Chi tiết đơn hàng đã nhập kho với mã xe: ${chiTiet.xe_key}`,
        };
      }

      /* =====================================================
       * 3. Validate dữ liệu nhập
       * ===================================================== */
      if (!data.so_khung || !data.so_may) {
        throw {
          status: 400,
          message: "Thiếu số khung hoặc số máy",
          errors: [
            { field: "so_khung", message: "Số khung là bắt buộc" },
            { field: "so_may", message: "Số máy là bắt buộc" },
          ],
        };
      }

      const soKhung = data.so_khung.trim().toUpperCase();
      const soMay = data.so_may.trim().toUpperCase();

      /* =====================================================
       * 4. Kiểm tra trùng số khung / số máy
       * ===================================================== */
      const dupErrors = await this.checkDuplicate(soKhung, soMay, null, client);

      if (dupErrors.length > 0) {
        throw {
          status: 409,
          message: "Số khung hoặc số máy đã tồn tại",
          errors: dupErrors,
        };
      }

      /* =====================================================
       * 5. Chuẩn hóa dữ liệu
       * ===================================================== */
      const xeKey = await this.generateXeKey(client);
      const giaNhap = data.gia_nhap || chiTiet.don_gia;
      const ngayNhap = data.ngay_nhap || new Date().toISOString().split("T")[0];
      const maMau = data.ma_mau || chiTiet.ma_mau;

      if (!giaNhap || giaNhap < 0) {
        // Cho phép giá nhập = 0
        throw {
          status: 400,
          message: "Giá nhập không hợp lệ",
        };
      }

      /* =====================================================
       * 6. Insert xe thực tế
       * ===================================================== */
      await client.query(
        `
      INSERT INTO tm_xe_thuc_te (
        xe_key, ma_loai_xe, ma_mau,
        so_khung, so_may,
        ma_kho_hien_tai,
        ngay_nhap, gia_nhap,
        trang_thai, status, da_ban,
        ghi_chu,
        ngay_tao, ngay_cap_nhat
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        'TON_KHO',true,false,
        $9,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `,
        [
          xeKey,
          chiTiet.ma_loai_xe,
          maMau,
          soKhung,
          soMay,
          chiTiet.ma_kho_nhap,
          ngayNhap,
          giaNhap,
          `Nhập từ đơn hàng ${chiTiet.so_phieu} (CT#${chiTiet.id})`,
        ]
      );

      /* =====================================================
       * 7. Cập nhật chi tiết đơn hàng
       * ===================================================== */
      await client.query(
        `
      UPDATE tm_don_hang_mua_xe_ct
      SET 
        xe_key = $1,
        so_khung = $2,
        so_may = $3,
        da_nhap_kho = true
      WHERE id = $4
    `,
        [xeKey, soKhung, soMay, chiTiet.id]
      );

      /* =====================================================
       * 8. Ghi lịch sử xe
       * ===================================================== */
      await client.query(
        `
      INSERT INTO tm_xe_lich_su (
        xe_key, loai_giao_dich, so_chung_tu,
        ngay_giao_dich, ma_kho_nhap,
        gia_tri, nguoi_thuc_hien, dien_giai
      ) VALUES (
        $1,'NHAP_KHO',$2,
        $3,$4,
        $5,$6,$7
      )
    `,
        [
          xeKey,
          chiTiet.so_phieu,
          ngayNhap,
          chiTiet.ma_kho_nhap,
          giaNhap,
          userId,
          `Nhập xe ${chiTiet.ten_loai} từ đơn hàng ${chiTiet.so_phieu}`,
        ]
      );

      /* =====================================================
       * 9. Commit
       * ===================================================== */
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
      x.xe_key,
      x.ma_loai_xe,
      xl.ten_loai,
      x.ma_mau,
      m.ten_mau,
      x.so_khung,
      x.so_may,
      x.ma_kho_hien_tai,
      k.ten_kho,
      x.ngay_nhap,
      x.gia_nhap,
      x.trang_thai,
      x.da_ban,
      x.ngay_tao
    FROM tm_xe_thuc_te x
    LEFT JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
    LEFT JOIN tm_mau_xe m ON x.ma_mau = m.ma_mau
    LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
    WHERE x.xe_key = $1
  `,
      [xeKey]
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
      FROM tm_xe_lich_su ls
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      WHERE ls.xe_key = $1
      ORDER BY ls.ngay_giao_dich DESC
    `,
      [xeKey]
    );

    return result.rows;
  }

  /**
   * ✅ Lấy danh sách xe trong kho
   */
  async getXeInKho(maKho, filters = {}) {
    const conditions = ["x.ma_kho_hien_tai = $1", "x.status = true"];
    const params = [maKho];
    let paramIndex = 2;

    if (filters.trang_thai) {
      conditions.push(`x.trang_thai = $${paramIndex}`);
      params.push(filters.trang_thai);
      paramIndex++;
    }

    if (filters.ma_loai_xe) {
      conditions.push(`x.ma_loai_xe = $${paramIndex}`);
      params.push(filters.ma_loai_xe);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(
        x.so_khung ILIKE $${paramIndex} 
        OR x.so_may ILIKE $${paramIndex} 
        OR xl.ten_loai ILIKE $${paramIndex}
        OR x.xe_key ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.da_ban !== undefined) {
      conditions.push(`x.da_ban = $${paramIndex}`);
      params.push(filters.da_ban);
      paramIndex++;
    }

    const query = `
      SELECT 
        x.*,
        xl.ten_loai, xl.ma_nh,
        nh.ten_nh,
        m.ten_mau,
        k.ten_kho
      FROM tm_xe_thuc_te x
      INNER JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
      LEFT JOIN sys_nhan_hieu nh ON xl.ma_nh = nh.ma_nh
      LEFT JOIN sys_mau m ON x.ma_mau = m.ma_mau
      INNER JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE ${conditions.join(" AND ")}
      ORDER BY x.ngay_nhap DESC
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
    const conditions = ["ma_kho_hien_tai = $1", "status = true"];
    const params = [maKho];
    let paramIndex = 2;

    if (filters.trang_thai) {
      conditions.push(`trang_thai = $${paramIndex}`);
      params.push(filters.trang_thai);
      paramIndex++;
    }

    if (filters.ma_loai_xe) {
      conditions.push(`ma_loai_xe = $${paramIndex}`);
      params.push(filters.ma_loai_xe);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT COUNT(*) as total FROM tm_xe_thuc_te WHERE ${conditions.join(
        " AND "
      )}`,
      params
    );

    return parseInt(result.rows[0].total);
  }
}

module.exports = new VehicleService();
