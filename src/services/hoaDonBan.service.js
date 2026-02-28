const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");
const PhuTung = require("../models/PhuTung");
const ThuChiService = require("./thuChi.service");

class HoaDonBanService {
  // Helper: Sinh mã hóa đơn tự động (HD + YYYYMMDD + Sequence)
  async _generateSoHd(client) {
    const { rows } = await client.query(`
      SELECT 
        'HD' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_hd')::text, 6, '0')
        AS so_hd
    `);
    return rows[0].so_hd;
  }

  // Tạo hóa đơn bán
  async taoHoaDon(data) {
    const {
      ngay_ban,
      ma_kho_xuat,
      ma_kh,
      nguoi_tao,
      ghi_chu,
      chiet_khau,
      vat_percentage,
    } = data;
    const ck = Number(chiet_khau || 0);
    const vat = Number(vat_percentage || 0);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const so_hd = await this._generateSoHd(client);

      const result = await client.query(
        `INSERT INTO tm_hoa_don (
          so_hoa_don, ngay_hoa_don, ma_ben_xuat, loai_ben_xuat,
          ma_ben_nhap, loai_ben_nhap, loai_hoa_don,
          chiet_khau, tien_thue_gtgt,
          tong_tien, thanh_tien,
          trang_thai, ghi_chu
        ) VALUES ($1, $2, $3, 'KHO', $4, 'DOI_TAC', 'BAN_HANG',
                  $5, $6, 0, 0, $7, $8)
        RETURNING *`,
        [so_hd, ngay_ban, ma_kho_xuat, ma_kh, ck, vat, "NHAP", ghi_chu],
      );

      await client.query("COMMIT");
      return {
        ...result.rows[0],
        so_hd: result.rows[0].so_hoa_don,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Cập nhật VAT & chiết khấu cho hóa đơn (chỉ được khi trạng thái NHAP)
  async updateVatChietKhau(so_hd, data) {
    const { chiet_khau, vat_percentage, ghi_chu } = data;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const hdRes = await client.query(
        `SELECT trang_thai FROM tm_hoa_don WHERE so_hoa_don = $1`,
        [so_hd],
      );
      if (!hdRes.rows[0]) throw new Error("Hóa đơn không tồn tại");
      if (hdRes.rows[0].trang_thai !== "NHAP") {
        throw new Error(
          `Không thể sửa hóa đơn ở trạng thái ${hdRes.rows[0].trang_thai}`,
        );
      }

      // Cập nhật và tính lại thanh_tien = (tong_tien - CK) * (1 + VAT%)
      const result = await client.query(
        `UPDATE tm_hoa_don
         SET
           chiet_khau       = COALESCE($1, chiet_khau),
           tien_thue_gtgt   = CASE
             WHEN $2 IS NOT NULL THEN
               (tong_tien - COALESCE($1, chiet_khau)) * $2 / 100
             ELSE tien_thue_gtgt
           END,
           thanh_tien       = (
             (tong_tien - COALESCE($1, chiet_khau))
             + (tong_tien - COALESCE($1, chiet_khau))
               * COALESCE($2, tien_thue_gtgt / NULLIF(tong_tien - chiet_khau, 0) * 100, 0)
               / 100
           ),
           ghi_chu          = COALESCE($3, ghi_chu),
           updated_at       = CURRENT_TIMESTAMP
         WHERE so_hoa_don = $4
         RETURNING *`,
        [chiet_khau ?? null, vat_percentage ?? null, ghi_chu ?? null, so_hd],
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

  // Thêm xe vào hóa đơn
  async themXe(so_hd, xe_key, don_gia) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Kiểm tra hóa đơn
      const hdResult = await client.query(
        "SELECT trang_thai, ma_ben_xuat as ma_kho_xuat FROM tm_hoa_don WHERE so_hoa_don = $1",
        [so_hd],
      );

      if (!hdResult.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      if (hdResult.rows[0].trang_thai !== "NHAP") {
        throw new Error(
          `Không thể sửa hóa đơn ở trạng thái ${hdResult.rows[0].trang_thai}`,
        );
      }

      const ma_kho_xuat = hdResult.rows[0].ma_kho_xuat;

      // Kiểm tra xe có tồn tại và khả dụng
      const xeResult = await client.query(
        `SELECT ma_hang_hoa, locked, trang_thai, ma_kho_hien_tai
         FROM tm_hang_hoa_serial 
         WHERE ma_serial = $1`,
        [xe_key],
      );

      if (!xeResult.rows[0]) {
        throw new Error("Xe không tồn tại");
      }

      const xe = xeResult.rows[0];

      if (xe.locked) {
        throw new Error("Xe đang bị khóa bởi phiếu khác");
      }

      if (xe.trang_thai !== "TON_KHO") {
        throw new Error(`Xe không thể bán (trạng thái: ${xe.trang_thai})`);
      }

      if (xe.ma_kho_hien_tai !== ma_kho_xuat) {
        throw new Error(`Xe không có tại kho ${ma_kho_xuat}`);
      }

      // Lấy STT
      const sttResult = await client.query(
        "SELECT COALESCE(MAX(stt), 0) + 1 as next_stt FROM tm_hoa_don_chi_tiet WHERE so_hoa_don = $1",
        [so_hd],
      );
      const stt = sttResult.rows[0].next_stt;

      // Insert chi tiết
      await client.query(
        `INSERT INTO tm_hoa_don_chi_tiet (
          so_hoa_don, stt, ma_hang_hoa, ma_serial, so_luong, don_gia, thanh_tien
        ) VALUES ($1, $2, $3, $4, 1, $5, $5)`,
        [so_hd, stt, xe.ma_hang_hoa, xe_key, don_gia],
      );

      // Khóa xe
      await client.query(
        `UPDATE tm_hang_hoa_serial
         SET locked = TRUE, ghi_chu = COALESCE(ghi_chu, '') || E'\nKhóa theo HD: ' || $1
         WHERE ma_serial = $2`,
        [so_hd, xe_key],
      );

      // Update tổng tiền
      await client.query(
        `UPDATE tm_hoa_don
         SET tong_tien = (SELECT SUM(thanh_tien) FROM tm_hoa_don_chi_tiet WHERE so_hoa_don = $1),
             thanh_tien = (SELECT SUM(thanh_tien) * (1 + COALESCE(tien_thue_gtgt, 0) / 100) - COALESCE(chiet_khau, 0) FROM tm_hoa_don_chi_tiet WHERE so_hoa_don = $1)
         WHERE so_hoa_don = $1`,
        [so_hd],
      );

      await client.query("COMMIT");
      return { success: true, stt };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Thêm phụ tùng vào hóa đơn
  async themPhuTung(so_hd, chi_tiet) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Kiểm tra hóa đơn
      const hdResult = await client.query(
        "SELECT trang_thai, ma_ben_xuat as ma_kho_xuat FROM tm_hoa_don WHERE so_hoa_don = $1",
        [so_hd],
      );

      if (!hdResult.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      if (hdResult.rows[0].trang_thai !== "NHAP") {
        throw new Error(
          `Không thể sửa hóa đơn ở trạng thái ${hdResult.rows[0].trang_thai}`,
        );
      }

      const { ma_pt, so_luong, don_gia } = chi_tiet;
      const ma_kho_xuat = hdResult.rows[0].ma_kho_xuat;
      const thanh_tien = so_luong * don_gia;

      // Khóa phụ tùng
      await PhuTung.lock(
        client,
        ma_pt,
        ma_kho_xuat,
        so_hd,
        "BAN_HANG",
        so_luong,
        `Khách đặt mua theo hóa đơn ${so_hd}`,
      );

      // Lấy STT
      const sttResult = await client.query(
        "SELECT COALESCE(MAX(stt), 0) + 1 as next_stt FROM tm_hoa_don_chi_tiet WHERE so_hoa_don = $1",
        [so_hd],
      );
      const stt = sttResult.rows[0].next_stt;

      // Insert chi tiết
      await client.query(
        `INSERT INTO tm_hoa_don_chi_tiet (
          so_hoa_don, stt, ma_hang_hoa, so_luong, don_gia, thanh_tien
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [so_hd, stt, ma_pt, so_luong, don_gia, thanh_tien],
      );

      // Update tổng tiền
      await client.query(
        `UPDATE tm_hoa_don
         SET tong_tien = (SELECT SUM(thanh_tien) FROM tm_hoa_don_chi_tiet WHERE so_hoa_don = $1),
             thanh_tien = (SELECT SUM(thanh_tien) * (1 + COALESCE(tien_thue_gtgt, 0) / 100) - COALESCE(chiet_khau, 0) FROM tm_hoa_don_chi_tiet WHERE so_hoa_don = $1)
         WHERE so_hoa_don = $1`,
        [so_hd],
      );

      await client.query("COMMIT");
      return { success: true, stt };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Phê duyệt hóa đơn
  async pheDuyet(so_hd, nguoi_duyet, so_tien_thu = null) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Lấy thông tin hóa đơn
      const hdResult = await client.query(
        `SELECT * FROM tm_hoa_don WHERE so_hoa_don = $1`,
        [so_hd],
      );

      if (!hdResult.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      const hd = hdResult.rows[0];

      if (hd.trang_thai !== "NHAP" && hd.trang_thai !== "CHO_DUYET") {
        throw new Error(
          `Không thể duyệt hóa đơn ở trạng thái ${hd.trang_thai}`,
        );
      }

      // Xác định số tiền thu ngay
      // Nếu là null (mặc định), thu toàn bộ. Nếu là 0, ghi nợ hoàn toàn.
      const thucThu =
        so_tien_thu === null ? Number(hd.thanh_tien) : Number(so_tien_thu);

      // Lấy chi tiết
      const chiTietResult = await client.query(
        "SELECT * FROM tm_hoa_don_chi_tiet WHERE so_hoa_don = $1 ORDER BY stt",
        [so_hd],
      );

      // Xử lý từng dòng chi tiết (Giảm kho, ghi lịch sử)
      for (const ct of chiTietResult.rows) {
        if (ct.ma_serial) {
          // Xử lý xe
          await client.query(
            `UPDATE tm_hang_hoa_serial
             SET trang_thai = 'DA_BAN',
                 locked = FALSE,
                 so_hoa_don_ban = $2,
                 ngay_ban = CURRENT_DATE,
                 la_xe_cua_hang = TRUE
             WHERE ma_serial = $1`,
            [ct.ma_serial, so_hd],
          );

          // Ghi lịch sử
          await client.query(
            `INSERT INTO tm_hang_hoa_lich_su (
              ma_hang_hoa, ma_serial, loai_giao_dich, so_chung_tu, ngay_giao_dich,
              ma_kho_xuat, so_luong, don_gia, thanh_tien, nguoi_thuc_hien, dien_giai
            ) VALUES ($1, $2, 'BAN_HANG', $3, CURRENT_TIMESTAMP, $4, -1, $5, $6, $7, $8)`,
            [
              ct.ma_hang_hoa,
              ct.ma_serial,
              so_hd,
              hd.ma_ben_xuat,
              ct.don_gia,
              -ct.thanh_tien,
              nguoi_duyet,
              `Bán xe theo hóa đơn ${so_hd}`,
            ],
          );

          // Tự động tạo nhắc nhở bảo trì lần đầu sau khi mua xe (30 ngày hoặc 1000km)
          await client.query(
            `INSERT INTO tm_nhac_nho_bao_duong (ma_serial, ma_khach_hang, loai_nhac_nho, ngay_du_kien, so_km_du_kien) 
             VALUES ($1, $2, 'BAO_DUONG_DINH_KY', CURRENT_DATE + INTERVAL '30 days', 1000)`,
            [ct.ma_serial, hd.ma_ben_nhap],
          );
        } else {
          // Phụ tùng
          // Giảm tồn kho
          await client.query(
            `UPDATE tm_hang_hoa_ton_kho
             SET so_luong_ton = so_luong_ton - $1,
                 so_luong_khoa = so_luong_khoa - $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE ma_hang_hoa = $2 AND ma_kho = $3`,
            [ct.so_luong, ct.ma_hang_hoa, hd.ma_ben_xuat],
          );

          // Ghi lịch sử
          await client.query(
            `INSERT INTO tm_hang_hoa_lich_su (
              ma_hang_hoa, loai_giao_dich, so_chung_tu, ngay_giao_dich,
              ma_kho_xuat, so_luong, don_gia, thanh_tien, nguoi_thuc_hien, dien_giai
            ) VALUES ($1, 'BAN_HANG', $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8)`,
            [
              ct.ma_hang_hoa,
              so_hd,
              hd.ma_ben_xuat,
              -ct.so_luong,
              ct.don_gia,
              -ct.thanh_tien,
              nguoi_duyet,
              `Bán phụ tùng theo hóa đơn ${so_hd}`,
            ],
          );

          // Xóa khóa
          await client.query(
            "DELETE FROM tm_hang_hoa_khoa WHERE so_phieu = $1 AND ma_hang_hoa = $2",
            [so_hd, ct.ma_hang_hoa],
          );
        }
      }

      // 1. Ghi nhận công nợ đối tác (Luôn ghi nhận tổng số nợ phát sinh)
      const CongNoService = require("./congNo.service");
      await CongNoService.recordDoiTacDebt(client, {
        ma_doi_tac: hd.ma_ben_nhap,
        loai_cong_no: "PHAI_THU",
        so_hoa_don: so_hd,
        ngay_phat_sinh: hd.ngay_hoa_don,
        so_tien: hd.thanh_tien,
        ghi_chu: `Bán hàng theo hóa đơn ${so_hd}`,
      });

      // 2. Xử lý thanh toán nếu có thu tiền ngay
      if (thucThu > 0) {
        // Tạo phiếu thu
        const phieuThu = await ThuChiService.taoPhieu(
          {
            nguoi_tao: nguoi_duyet,
            ngay_giao_dich: new Date(),
            ma_kho: hd.ma_ben_xuat,
            ma_kh: hd.ma_ben_nhap,
            so_tien: thucThu,
            loai: "THU",
            hinh_thuc: "TIEN_MAT", // Mặc định
            dien_giai: `Thu tiền bán hàng (một phần hoặc toàn bộ) theo hóa đơn ${so_hd}`,
            ma_hoa_don: so_hd,
          },
          client,
        );

        // Duyệt phiếu thu ngay lập tức để thực hiện thanh toán vào công nợ vừa ghi
        await ThuChiService.pheDuyet(phieuThu.so_phieu_tc, nguoi_duyet, client);
      }

      // 3. Update trạng thái hóa đơn
      // Nếu thu đủ tiền -> DA_THANH_TOAN, ngược lại -> DA_XUAT (chờ thu nợ)
      const trangThaiMoi =
        thucThu >= Number(hd.thanh_tien) ? "DA_THANH_TOAN" : "DA_XUAT";

      await client.query(
        `UPDATE tm_hoa_don
         SET trang_thai = $1, 
             nguoi_duyet = $2,
             ngay_duyet = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE so_hoa_don = $3`,
        [trangThaiMoi, nguoi_duyet, so_hd],
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Đã duyệt hóa đơn ${so_hd}. Thực thu: ${thucThu} VNĐ. Trạng thái: ${trangThaiMoi}`,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Lấy danh sách hóa đơn
  async getDanhSach(filters = {}) {
    let sql = `
      SELECT 
        h.id, h.so_hoa_don as so_hd, h.ngay_hoa_don as ngay_ban, h.ma_ben_xuat as ma_kho_xuat, h.ma_ben_nhap as ma_kh,
        h.tong_tien, h.chiet_khau, h.tien_thue_gtgt as vat, h.thanh_tien as thanh_toan,
        h.trang_thai, h.ngay_lap as created_at, h.ghi_chu,
        h.nguoi_lap as nguoi_tao,
        k.ten_kho, kh.ten_doi_tac as ten_khach_hang
      FROM tm_hoa_don h
      INNER JOIN sys_kho k ON h.ma_ben_xuat = k.ma_kho
      INNER JOIN dm_doi_tac kh ON h.ma_ben_nhap = kh.ma_doi_tac
      WHERE h.loai_hoa_don = 'BAN_HANG'
    `;

    const params = [];

    if (filters.trang_thai) {
      params.push(filters.trang_thai);
      sql += ` AND h.trang_thai = $${params.length}`;
    }

    if (filters.ma_kho_xuat) {
      params.push(filters.ma_kho_xuat);
      sql += ` AND h.ma_ben_xuat = $${params.length}`;
    }

    sql += " ORDER BY h.ngay_hoa_don DESC, h.so_hoa_don DESC";

    const result = await pool.query(sql, params);
    return result.rows;
  }

  async getById(so_hd) {
    if (!so_hd || typeof so_hd !== "string") {
      throw new Error("so_hd không hợp lệ");
    }

    so_hd = so_hd.trim();

    const headerResult = await pool.query(
      `SELECT
      h.*,
      h.so_hoa_don as so_hd,
      h.ngay_hoa_don as ngay_ban,
      h.ma_ben_xuat as ma_kho_xuat,
      h.ma_ben_nhap as ma_kh,
      h.nguoi_lap as nguoi_tao,
      -- Lấy thông tin bên xuất
      COALESCE(kx.ten_kho, dtx.ten_doi_tac) as ten_ben_xuat,
      COALESCE(kx.dia_chi, dtx.dia_chi) as dia_chi_ben_xuat,
      COALESCE(kx.dien_thoai, dtx.dien_thoai, '') as sdt_ben_xuat,
      -- Lấy thông tin bên nhập
      COALESCE(kn.ten_kho, dtn.ten_doi_tac) as ten_ben_nhap,
      COALESCE(kn.dia_chi, dtn.dia_chi) as dia_chi_ben_nhap,
      COALESCE(kn.dien_thoai, dtn.dien_thoai, '') as sdt_ben_nhap
    FROM tm_hoa_don h
    -- Join Bên Xuất
    LEFT JOIN sys_kho kx ON h.ma_ben_xuat = kx.ma_kho AND h.loai_ben_xuat = 'KHO'
    LEFT JOIN dm_doi_tac dtx ON h.ma_ben_xuat = dtx.ma_doi_tac AND h.loai_ben_xuat = 'DOI_TAC'
    -- Join Bên Nhập
    LEFT JOIN sys_kho kn ON h.ma_ben_nhap = kn.ma_kho AND h.loai_ben_nhap = 'KHO'
    LEFT JOIN dm_doi_tac dtn ON h.ma_ben_nhap = dtn.ma_doi_tac AND h.loai_ben_nhap = 'DOI_TAC'
    WHERE h.so_hoa_don = $1`,
      [so_hd],
    );

    if (headerResult.rows.length === 0) {
      throw new Error(`Không tìm thấy hóa đơn: ${so_hd}`);
    }

    const detailsResult = await pool.query(
      `SELECT ct.stt, ct.ma_serial as xe_key, ct.ma_hang_hoa as ma_pt, ct.so_luong, ct.don_gia, ct.thanh_tien,
              pt.ten_hang_hoa as ten_pt, pt.don_vi_tinh
       FROM tm_hoa_don_chi_tiet ct
       LEFT JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
       WHERE ct.so_hoa_don = $1
       ORDER BY ct.stt`,
      [so_hd],
    );

    const chi_tiet_xe = detailsResult.rows.filter((r) => r.xe_key);
    const chi_tiet_pt = detailsResult.rows.filter((r) => !r.xe_key);

    return {
      ...headerResult.rows[0],
      chi_tiet_xe,
      chi_tiet_pt,
    };
  }

  // Lấy chi tiết hóa đơn cho export
  async getAllDetails(filters = {}) {
    let sql = `
      SELECT 
        ct.*, 
        h.ngay_hoa_don as ngay_lap,
        h.ma_ben_xuat as ma_kho_xuat,
        pt.ten_hang_hoa as ten_pt,
        pt.don_vi_tinh
      FROM tm_hoa_don_chi_tiet ct
      INNER JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
      LEFT JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
      WHERE h.loai_hoa_don = 'BAN_HANG'
    `;
    const params = [];
    const result = await pool.query(sql, params);
    return result.rows;
  }

  // Gửi duyệt giao hàng
  async guiDuyetGiao(so_hd, nguoi_gui) {
    const result = await pool.query(
      `UPDATE tm_hoa_don
       SET trang_thai = 'CHO_DUYET_GIAO',
           nguoi_gui_duyet_giao = $1,
           ngay_gui_duyet_giao = NOW()
       WHERE so_hoa_don = $2
         AND trang_thai = 'DA_XUAT'
       RETURNING *`,
      [nguoi_gui, so_hd],
    );

    if (result.rowCount === 0) {
      throw new Error(
        'Hóa đơn không ở trạng thái "Đã xuất kho" hoặc không tồn tại',
      );
    }

    return result.rows[0];
  }

  // Phê duyệt giao hàng
  async pheDuyetGiao(so_hd, nguoi_duyet, ghi_chu) {
    const result = await pool.query(
      `UPDATE tm_hoa_don
       SET trang_thai = 'DA_DUYET_GIAO',
           nguoi_duyet_giao = $1,
           ngay_duyet_giao = NOW(),
           ghi_chu_duyet_giao = $2
       WHERE so_hoa_don = $3
         AND trang_thai = 'CHO_DUYET_GIAO'
       RETURNING *`,
      [nguoi_duyet, ghi_chu, so_hd],
    );

    if (result.rowCount === 0) {
      throw new Error(
        'Hóa đơn không ở trạng thái "Chờ duyệt giao" hoặc không tồn tại',
      );
    }

    return result.rows[0];
  }

  // Xác nhận đã giao hàng (chỉ được gọi sau khi đã duyệt)
  async xacNhanDaGiao(so_hd, nguoi_xac_nhan) {
    const result = await pool.query(
      `UPDATE tm_hoa_don
       SET trang_thai = 'DA_GIAO',
           updated_by = $1,
           updated_at = NOW()
       WHERE so_hoa_don = $2
         AND trang_thai = 'DA_DUYET_GIAO'
       RETURNING *`,
      [nguoi_xac_nhan, so_hd],
    );

    if (result.rowCount === 0) {
      throw new Error("Hóa đơn chưa được duyệt giao hoặc không tồn tại");
    }

    return result.rows[0];
  }

  // Thanh toán hóa đơn (dùng cho trường hợp thanh toán sau hoặc trả góp)
  async thanhToan(so_hd, data, nguoi_thuc_hien) {
    const { so_tien, hinh_thuc, ma_quy, ghi_chu } = data;

    if (!so_tien || so_tien <= 0) {
      throw new Error("Số tiền thanh toán không hợp lệ");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Lấy thông tin hóa đơn
      const hdResult = await client.query(
        "SELECT * FROM tm_hoa_don WHERE so_hoa_don = $1",
        [so_hd],
      );
      if (hdResult.rowCount === 0) throw new Error("Hóa đơn không tồn tại");
      const hd = hdResult.rows[0];

      // 2. Tạo phiếu thu
      const phieuThu = await ThuChiService.taoPhieu(
        {
          nguoi_tao: nguoi_thuc_hien,
          ngay_giao_dich: new Date(),
          ma_kho: hd.ma_ben_xuat,
          ma_kh: hd.ma_ben_nhap,
          so_tien: so_tien,
          loai: "THU",
          hinh_thuc: hinh_thuc || "TIEN_MAT",
          dien_giai: ghi_chu || `Thanh toán bổ sung cho hóa đơn ${so_hd}`,
          ma_hoa_don: so_hd,
        },
        client,
      );

      // 3. Duyệt phiếu thu (Cập nhật quỹ)
      await ThuChiService.pheDuyet(
        phieuThu.so_phieu_tc,
        nguoi_thuc_hien,
        client,
      );

      await client.query("COMMIT");
      return phieuThu;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new HoaDonBanService();
