const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");
const PhuTung = require("../models/PhuTung");

class HoaDonBanService {
  // Helper: Sinh mã hóa đơn tự động (HD + YYYYMMDD + Sequence)
  async _generateSoHd(client) {
    // Try to use seq_hd, or fallback/create if possible (but we assume DB has it or we use timestamp fallback if query fails?
    // Ideally we assume seq_hd exists like seq_po.
    const { rows } = await client.query(`
      SELECT 
        'HD' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_hd')::text, 6, '0')
        AS so_hd
    `);
    return rows[0].so_hd;
  }

  // Tạo hóa đơn bán
  async taoHoaDon(data) {
    const { ngay_ban, ma_kho_xuat, ma_kh, nguoi_tao, ghi_chu } = data;

    // Use transaction for safe code generation
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const so_hd = await this._generateSoHd(client);

      const result = await client.query(
        `INSERT INTO tm_hoa_don_ban (
          so_hd, ngay_ban, ma_kho_xuat, ma_kh,
          nguoi_tao, trang_thai, ghi_chu
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          so_hd,
          ngay_ban,
          ma_kho_xuat,
          ma_kh,
          nguoi_tao,
          TRANG_THAI.NHAP,
          ghi_chu,
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

  // Thêm xe vào hóa đơn
  async themXe(so_hd, xe_key, don_gia) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Kiểm tra hóa đơn
      const hdResult = await client.query(
        "SELECT trang_thai, ma_kho_xuat FROM tm_hoa_don_ban WHERE so_hd = $1",
        [so_hd]
      );

      if (!hdResult.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      if (hdResult.rows[0].trang_thai !== TRANG_THAI.NHAP) {
        throw new Error(
          `Không thể sửa hóa đơn ở trạng thái ${hdResult.rows[0].trang_thai}`
        );
      }

      const ma_kho_xuat = hdResult.rows[0].ma_kho_xuat;

      // Kiểm tra xe có tồn tại và khả dụng
      const xeResult = await client.query(
        `SELECT ma_loai_xe, ma_mau, so_khung, so_may, locked, trang_thai, ma_kho_hien_tai
         FROM tm_xe_thuc_te 
         WHERE xe_key = $1`,
        [xe_key]
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
        "SELECT COALESCE(MAX(stt), 0) + 1 as next_stt FROM tm_hoa_don_ban_ct WHERE ma_hd = $1",
        [so_hd]
      );
      const stt = sttResult.rows[0].next_stt;

      // Insert chi tiết
      await client.query(
        `INSERT INTO tm_hoa_don_ban_ct (
          ma_hd, stt, loai_hang, xe_key, so_luong, don_gia, thanh_tien
        ) VALUES ($1, $2, $3, $4, 1, $5, $5)`,
        [so_hd, stt, "XE", xe_key, don_gia]
      );

      // Khóa xe
      await client.query(
        `UPDATE tm_xe_thuc_te
         SET locked = TRUE, locked_by = $1, locked_at = CURRENT_TIMESTAMP,
             locked_reason = $2
         WHERE xe_key = $3`,
        [so_hd, `Khách hàng đặt mua theo hóa đơn ${so_hd}`, xe_key]
      );

      // Update tổng tiền
      await client.query(
        `UPDATE tm_hoa_don_ban
         SET tong_tien = (
           SELECT SUM(thanh_tien) FROM tm_hoa_don_ban_ct WHERE ma_hd = $1
         ),
         thanh_toan = (
           SELECT SUM(thanh_tien) * (1 + COALESCE(vat, 0) / 100) - COALESCE(chiet_khau, 0)
           FROM tm_hoa_don_ban_ct 
           WHERE ma_hd = $1
         )
         WHERE so_hd = $1`,
        [so_hd]
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
        "SELECT trang_thai, ma_kho_xuat FROM tm_hoa_don_ban WHERE so_hd = $1",
        [so_hd]
      );

      if (!hdResult.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      if (hdResult.rows[0].trang_thai !== TRANG_THAI.NHAP) {
        throw new Error(
          `Không thể sửa hóa đơn ở trạng thái ${hdResult.rows[0].trang_thai}`
        );
      }

      const { ma_pt, so_luong, don_gia } = chi_tiet;
      const ma_kho_xuat = hdResult.rows[0].ma_kho_xuat;
      const thanh_tien = so_luong * don_gia;

      // Khóa phụ tùng
      await PhuTung.lock(
        ma_pt,
        ma_kho_xuat,
        so_hd,
        "HOA_DON_BAN",
        so_luong,
        `Khách đặt mua theo hóa đơn ${so_hd}`
      );

      // Lấy STT
      const sttResult = await client.query(
        "SELECT COALESCE(MAX(stt), 0) + 1 as next_stt FROM tm_hoa_don_ban_ct WHERE ma_hd = $1",
        [so_hd]
      );
      const stt = sttResult.rows[0].next_stt;

      // Insert chi tiết
      await client.query(
        `INSERT INTO tm_hoa_don_ban_ct (
          ma_hd, stt, loai_hang, ma_pt, so_luong, don_gia, thanh_tien
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [so_hd, stt, "PHU_TUNG", ma_pt, so_luong, don_gia, thanh_tien]
      );

      // Update tổng tiền
      await client.query(
        `UPDATE tm_hoa_don_ban
         SET tong_tien = (
           SELECT SUM(thanh_tien) FROM tm_hoa_don_ban_ct WHERE ma_hd = $1
         ),
         thanh_toan = (
           SELECT SUM(thanh_tien) * (1 + COALESCE(vat, 0) / 100) - COALESCE(chiet_khau, 0)
           FROM tm_hoa_don_ban_ct 
           WHERE ma_hd = $1
         )
         WHERE so_hd = $1`,
        [so_hd]
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
  async pheDuyet(so_hd, nguoi_duyet) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Lấy thông tin hóa đơn
      const hdResult = await client.query(
        `SELECT * FROM tm_hoa_don_ban WHERE so_hd = $1`,
        [so_hd]
      );

      if (!hdResult.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      const hd = hdResult.rows[0];

      if (hd.trang_thai !== TRANG_THAI.GUI_DUYET) {
        throw new Error(
          `Không thể duyệt hóa đơn ở trạng thái ${hd.trang_thai}`
        );
      }

      // Lấy chi tiết
      const chiTietResult = await client.query(
        "SELECT * FROM tm_hoa_don_ban_ct WHERE ma_hd = $1 ORDER BY stt",
        [so_hd]
      );

      // Xử lý từng dòng
      for (const ct of chiTietResult.rows) {
        if (ct.loai_hang === "XE") {
          // Xử lý xe
          await client.query(
            `UPDATE tm_xe_thuc_te
             SET da_ban = TRUE, ngay_ban = $1, gia_ban = $2,
                 ma_kh = $3, ma_kho_hien_tai = NULL, trang_thai = 'DA_BAN',
                 locked = FALSE, locked_by = NULL
             WHERE xe_key = $4`,
            [hd.ngay_ban, ct.don_gia, hd.ma_kh, ct.xe_key]
          );

          // Ghi lịch sử
          await client.query(
            `INSERT INTO tm_xe_lich_su (
              xe_key, loai_giao_dich, so_chung_tu, ngay_giao_dich,
              ma_kho_xuat, gia_tri, nguoi_thuc_hien, dien_giai
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7)`,
            [
              ct.xe_key,
              "BAN_HANG",
              so_hd,
              hd.ma_kho_xuat,
              ct.don_gia,
              nguoi_duyet,
              `Bán xe theo hóa đơn ${so_hd}`,
            ]
          );
        } else if (ct.loai_hang === "PHU_TUNG") {
          // Giảm tồn kho
          await client.query(
            `UPDATE tm_phu_tung_ton_kho
             SET so_luong_ton = so_luong_ton - $1,
                 so_luong_khoa = so_luong_khoa - $1
             WHERE ma_pt = $2 AND ma_kho = $3`,
            [ct.so_luong, ct.ma_pt, hd.ma_kho_xuat]
          );

          // Ghi lịch sử
          await client.query(
            `INSERT INTO tm_phu_tung_lich_su (
              ma_pt, loai_giao_dich, so_chung_tu, ngay_giao_dich,
              ma_kho_xuat, so_luong, don_gia, thanh_tien,
              nguoi_thuc_hien, dien_giai
            ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)`,
            [
              ct.ma_pt,
              "BAN_HANG",
              so_hd,
              hd.ma_kho_xuat,
              -ct.so_luong,
              ct.don_gia,
              -ct.thanh_tien,
              nguoi_duyet,
              `Bán hàng theo hóa đơn ${so_hd}`,
            ]
          );

          // Xóa khóa
          await client.query(
            "DELETE FROM tm_phu_tung_khoa WHERE so_phieu = $1 AND ma_pt = $2",
            [so_hd, ct.ma_pt]
          );
        }
      }

      // Tạo phiếu thu tiền
      await client.query(
        `INSERT INTO tm_thu_chi (
          so_phieu, ngay_giao_dich, loai, ma_kho, ma_kh,
          so_tien, trang_thai, nguoi_tao, nguoi_duyet, ngay_duyet,
          lien_ket_phieu, dien_giai
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, CURRENT_TIMESTAMP, $9, $10)`,
        [
          "PT-" + so_hd,
          hd.ngay_ban,
          "THU",
          hd.ma_kho_xuat,
          hd.ma_kh,
          hd.thanh_toan,
          TRANG_THAI.DA_DUYET,
          nguoi_duyet,
          so_hd,
          `Thu tiền bán hàng theo hóa đơn ${so_hd}`,
        ]
      );

      // Update hóa đơn
      await client.query(
        `UPDATE tm_hoa_don_ban
         SET trang_thai = $1, nguoi_duyet = $2, ngay_duyet = CURRENT_TIMESTAMP
         WHERE so_hd = $3`,
        [TRANG_THAI.DA_DUYET, nguoi_duyet, so_hd]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Đã duyệt hóa đơn ${so_hd}. Đã xuất kho và thu ${hd.thanh_toan} VNĐ`,
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
        h.id, h.so_hd, h.ngay_ban, h.ma_kho_xuat, h.ma_kh,
        h.tong_tien, h.chiet_khau, h.vat, h.thanh_toan,
        h.trang_thai, h.nguoi_tao, h.nguoi_gui, h.nguoi_duyet,
        h.ngay_tao, h.ngay_gui, h.ngay_duyet, h.ghi_chu,
        k.ten_kho, kh.ho_ten as ten_khach_hang
      FROM tm_hoa_don_ban h
      INNER JOIN sys_kho k ON h.ma_kho_xuat = k.ma_kho
      INNER JOIN tm_khach_hang kh ON h.ma_kh = kh.ma_kh
      WHERE 1=1
    `;

    const params = [];

    if (filters.trang_thai) {
      params.push(filters.trang_thai);
      sql += ` AND h.trang_thai = $${params.length}`;
    }

    if (filters.ma_kho_xuat) {
      params.push(filters.ma_kho_xuat);
      sql += ` AND h.ma_kho_xuat = $${params.length}`;
    }

    sql += " ORDER BY h.ngay_ban DESC, h.so_hd DESC";

    const result = await pool.query(sql, params);
    return result.rows;
  }
  // Gửi duyệt hóa đơn
  async guiDuyet(so_hd, nguoi_gui) {
    const result = await pool.query(
      `
    UPDATE tm_hoa_don_ban
    SET trang_thai = $1,
        nguoi_gui = $2,
        ngay_gui = CURRENT_TIMESTAMP
    WHERE so_hd = $3
      AND trang_thai = $4
    RETURNING *
    `,
      [TRANG_THAI.GUI_DUYET, nguoi_gui, so_hd, TRANG_THAI.NHAP]
    );

    if (result.rowCount === 0) {
      throw new Error("Chỉ được gửi duyệt hóa đơn ở trạng thái NHẬP");
    }

    return result.rows[0];
  }
  // Từ chối hóa đơn bán
  async tuChoi(so_hd, nguoi_duyet) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Lấy hóa đơn
      const hdRes = await client.query(
        `SELECT so_hd, trang_thai 
       FROM tm_hoa_don_ban 
       WHERE so_hd = $1`,
        [so_hd]
      );

      if (!hdRes.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      const hd = hdRes.rows[0];

      if (hd.trang_thai !== TRANG_THAI.GUI_DUYET) {
        throw new Error("Chỉ được từ chối hóa đơn đang chờ duyệt");
      }

      // 2. Lấy chi tiết
      const ctRes = await client.query(
        `SELECT * FROM tm_hoa_don_ban_ct WHERE ma_hd = $1`,
        [so_hd]
      );

      // 3. Mở khóa từng dòng
      for (const ct of ctRes.rows) {
        if (ct.loai_hang === "XE") {
          await client.query(
            `UPDATE tm_xe_thuc_te
           SET locked = FALSE,
               locked_by = NULL,
               locked_at = NULL,
               locked_reason = NULL
           WHERE xe_key = $1`,
            [ct.xe_key]
          );
        }

        if (ct.loai_hang === "PHU_TUNG") {
          await client.query(
            `DELETE FROM tm_phu_tung_khoa
           WHERE so_phieu = $1 AND ma_pt = $2`,
            [so_hd, ct.ma_pt]
          );
        }
      }

      // 4. Update hóa đơn
      await client.query(
        `UPDATE tm_hoa_don_ban
       SET trang_thai = $1,
           nguoi_duyet = $2,
           ngay_duyet = CURRENT_TIMESTAMP
       WHERE so_hd = $3`,
        [TRANG_THAI.TU_CHOI, nguoi_duyet, so_hd]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Hóa đơn ${so_hd} đã bị từ chối`,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  // Hủy hóa đơn bán
  async huy(so_hd, nguoi_huy, ly_do = null) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Kiểm tra hóa đơn
      const hdRes = await client.query(
        `SELECT so_hd, trang_thai 
       FROM tm_hoa_don_ban 
       WHERE so_hd = $1`,
        [so_hd]
      );

      if (!hdRes.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      const hd = hdRes.rows[0];

      if (hd.trang_thai !== TRANG_THAI.NHAP) {
        throw new Error("Chỉ được hủy hóa đơn ở trạng thái NHẬP");
      }

      // 2. Lấy chi tiết
      const ctRes = await client.query(
        `SELECT * FROM tm_hoa_don_ban_ct WHERE ma_hd = $1`,
        [so_hd]
      );

      // 3. Mở khóa tài sản
      for (const ct of ctRes.rows) {
        if (ct.loai_hang === "XE") {
          await client.query(
            `UPDATE tm_xe_thuc_te
           SET locked = FALSE,
               locked_by = NULL,
               locked_at = NULL,
               locked_reason = NULL
           WHERE xe_key = $1`,
            [ct.xe_key]
          );
        }

        if (ct.loai_hang === "PHU_TUNG") {
          await client.query(
            `DELETE FROM tm_phu_tung_khoa
           WHERE so_phieu = $1 AND ma_pt = $2`,
            [so_hd, ct.ma_pt]
          );
        }
      }

      // 4. Cập nhật hóa đơn
      await client.query(
        `UPDATE tm_hoa_don_ban
       SET trang_thai = $1,
           ghi_chu = COALESCE(ghi_chu, '') || 
                     E'\nHủy hóa đơn: ' || COALESCE($2, ''),
           nguoi_duyet = $3,
           ngay_duyet = CURRENT_TIMESTAMP
       WHERE so_hd = $4`,
        [TRANG_THAI.HUY, ly_do, nguoi_huy, so_hd]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Hóa đơn ${so_hd} đã bị hủy`,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Xóa chi tiết hóa đơn bán
  async xoaChiTiet(so_hd, stt) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Kiểm tra hóa đơn
      const hdRes = await client.query(
        `SELECT trang_thai 
       FROM tm_hoa_don_ban 
       WHERE so_hd = $1`,
        [so_hd]
      );

      if (!hdRes.rows[0]) {
        throw new Error("Hóa đơn không tồn tại");
      }

      if (hdRes.rows[0].trang_thai !== TRANG_THAI.NHAP) {
        throw new Error("Chỉ được xóa chi tiết khi hóa đơn ở trạng thái NHẬP");
      }

      // 2. Lấy chi tiết
      const ctRes = await client.query(
        `SELECT * 
       FROM tm_hoa_don_ban_ct 
       WHERE ma_hd = $1 AND stt = $2`,
        [so_hd, stt]
      );

      if (!ctRes.rows[0]) {
        throw new Error("Chi tiết hóa đơn không tồn tại");
      }

      const ct = ctRes.rows[0];

      // 3. Mở khóa tài sản
      if (ct.loai_hang === "XE") {
        await client.query(
          `UPDATE tm_xe_thuc_te
         SET locked = FALSE,
             locked_by = NULL,
             locked_at = NULL,
             locked_reason = NULL
         WHERE xe_key = $1`,
          [ct.xe_key]
        );
      }

      if (ct.loai_hang === "PHU_TUNG") {
        await client.query(
          `DELETE FROM tm_phu_tung_khoa
         WHERE ma_phieu = $1 AND ma_pt = $2`,
          [so_hd, ct.ma_pt]
        );
      }

      // 4. Xóa chi tiết
      await client.query(
        `DELETE FROM tm_hoa_don_ban_ct
       WHERE ma_hd = $1 AND stt = $2`,
        [so_hd, stt]
      );

      // 5. Cập nhật lại tổng tiền
      await client.query(
        `UPDATE tm_hoa_don_ban
       SET tong_tien = COALESCE(
             (SELECT SUM(thanh_tien)
              FROM tm_hoa_don_ban_ct
              WHERE ma_hd = $1), 0),
           thanh_toan = COALESCE(
             (SELECT SUM(thanh_tien)
              FROM tm_hoa_don_ban_ct
              WHERE ma_hd = $1)
             * (1 + COALESCE(vat, 0) / 100)
             - COALESCE(chiet_khau, 0), 0)
       WHERE so_hd = $1`,
        [so_hd]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Đã xóa chi tiết STT ${stt} khỏi hóa đơn ${so_hd}`,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async getById(so_hd) {
    if (!so_hd || typeof so_hd !== "string") {
      throw new Error("so_hd không hợp lệ");
    }

    so_hd = so_hd.trim();

    console.log("getById so_hd =", so_hd);

    const headerResult = await pool.query(
      `SELECT * FROM tm_hoa_don_ban WHERE so_hd = $1`,
      [so_hd]
    );

    if (headerResult.rows.length === 0) {
      throw new Error(`Không tìm thấy hóa đơn: ${so_hd}`);
    }

    const xeResult = await pool.query(
      `SELECT stt, xe_key, don_gia, thanh_tien
     FROM tm_hoa_don_ban_ct
     WHERE ma_hd = $1 AND loai_hang = 'XE'
     ORDER BY stt`,
      [so_hd]
    );

    const ptResult = await pool.query(
      `SELECT stt, ma_pt, so_luong, don_gia, thanh_tien
     FROM tm_hoa_don_ban_ct
     WHERE ma_hd = $1 AND loai_hang = 'PHU_TUNG'
     ORDER BY stt`,
      [so_hd]
    );

    return {
      ...headerResult.rows[0],
      chi_tiet_xe: xeResult.rows,
      chi_tiet_pt: ptResult.rows,
    };
  }
  // Lấy chi tiết hóa đơn cho export
  static async getAllDetails(filters = {}) {
    let sql = `
      SELECT 
        ct.*, 
        h.ngay_ban as ngay_lap,
        h.ma_kho_xuat,
        pt.ten_pt,
        pt.don_vi_tinh
      FROM tm_hoa_don_ban_ct ct
      INNER JOIN tm_hoa_don_ban h ON ct.ma_hd = h.so_hd
      LEFT JOIN tm_phu_tung pt ON ct.ma_pt = pt.ma_pt
      WHERE 1=1
    `;
    const params = [];
    const result = await pool.query(sql, params);
    return result.rows;
  }
}

module.exports = new HoaDonBanService();
