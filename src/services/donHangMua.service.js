const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");
const PhuTung = require("../models/PhuTung");
const CongNoService = require("./congNo.service");

class DonHangMuaService {
  // Helper: Sinh mã phiếu tự động (POP + YYYYMMDD + Sequence)
  async _generateSoPhieu(client) {
    const { rows } = await client.query(`
      SELECT 
        'POP' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_po')::text, 6, '0')
        AS so_phieu
    `);
    return rows[0].so_phieu;
  }

  // Tạo đơn hàng mua mới
  async taoDonHang(data) {
    const { ngay_dat_hang, ma_kho_nhap, ma_ncc, nguoi_tao, dien_giai } = data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const so_phieu = await this._generateSoPhieu(client);

      const result = await client.query(
        `INSERT INTO tm_don_hang (
          so_don_hang, ngay_dat_hang, ma_ben_nhap, loai_ben_nhap,
          ma_ben_xuat, loai_ben_xuat, loai_don_hang,
          trang_thai, ghi_chu
        ) VALUES ($1, $2, $3, 'KHO', $4, 'DOI_TAC', 'MUA_HANG', $5, $6)
        RETURNING *`,
        [so_phieu, ngay_dat_hang, ma_kho_nhap, ma_ncc, "NHAP", dien_giai],
      );

      await client.query("COMMIT");
      return {
        ...result.rows[0],
        so_phieu: result.rows[0].so_don_hang,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Thêm phụ tùng vào đơn
  async themPhuTung(ma_phieu, chi_tiet) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Kiểm tra đơn hàng
      const donResult = await client.query(
        "SELECT trang_thai FROM tm_don_hang WHERE so_don_hang = $1",
        [ma_phieu],
      );

      if (!donResult.rows[0]) {
        throw new Error("Đơn hàng không tồn tại");
      }

      if (donResult.rows[0].trang_thai !== "NHAP") {
        throw new Error(
          `Không thể sửa đơn ở trạng thái ${donResult.rows[0].trang_thai}`,
        );
      }

      // Lấy STT tiếp theo
      const sttResult = await client.query(
        "SELECT COALESCE(MAX(stt), 0) + 1 as next_stt FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1",
        [ma_phieu],
      );
      const stt = sttResult.rows[0].next_stt;

      // Insert chi tiết
      let { ma_pt, so_luong, don_gia } = chi_tiet;

      await client.query(
        `INSERT INTO tm_don_hang_chi_tiet (
          so_don_hang, stt, ma_hang_hoa,
          so_luong_dat, don_gia
        ) VALUES ($1, $2, $3, $4, $5)`,
        [ma_phieu, stt, ma_pt, so_luong, don_gia],
      );

      // Update tổng tiền
      await client.query(
        `UPDATE tm_don_hang
         SET tong_gia_tri = (SELECT SUM(thanh_tien) FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1),
             thanh_tien = (SELECT SUM(thanh_tien) FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1)
         WHERE so_don_hang = $1`,
        [ma_phieu],
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

  // Gửi duyệt
  async guiDuyet(ma_phieu, nguoi_gui) {
    const result = await pool.query(
      `UPDATE tm_don_hang
       SET trang_thai = 'GUI_DUYET'
       WHERE (so_don_hang = $1 OR (CASE WHEN $1 ~ '^\\d+$' THEN id = $1::int ELSE FALSE END)) 
         AND trang_thai = 'NHAP'`,
      [ma_phieu],
    );

    if (result.rowCount === 0) {
      throw new Error("Phiếu không hợp lệ để gửi duyệt");
    }

    return { success: true, message: "Đã gửi duyệt thành công" };
  }

  // Phê duyệt
  // Phê duyệt đơn
  async pheDuyet(ma_phieu, nguoi_duyet) {
    const result = await pool.query(
      `UPDATE tm_don_hang
       SET trang_thai = 'DA_DUYET', 
           nguoi_duyet = $2,
           ngay_duyet = CURRENT_TIMESTAMP
       WHERE (so_don_hang = $1 OR (CASE WHEN $1 ~ '^\\d+$' THEN id = $1::int ELSE FALSE END)) 
         AND trang_thai = 'GUI_DUYET'
       RETURNING *`,
      [ma_phieu, nguoi_duyet],
    );

    if (result.rowCount === 0) {
      throw new Error(
        "Đơn hàng không hợp lệ để duyệt (Phải ở trạng thái GUI_DUYET)",
      );
    }

    return { success: true, message: "Đã duyệt đơn hàng thành công" };
  }

  // Nhập kho (Partial Receiving)
  async nhapKho(ma_phieu, danhSachHang, nguoi_nhap) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verify Header
      const donResult = await client.query(
        `SELECT so_don_hang, trang_thai, ma_ben_nhap as ma_kho_nhap, ma_ben_xuat as ma_ncc
         FROM tm_don_hang 
         WHERE so_don_hang = $1 
            OR (CASE WHEN $1 ~ '^\\d+$' THEN id = $1::int ELSE FALSE END)`,
        [ma_phieu],
      );

      if (!donResult.rows.length) throw new Error("Đơn hàng không tồn tại");
      const don = donResult.rows[0];
      const soPhieuCode = don.so_don_hang;

      if (
        don.trang_thai !== "DA_DUYET" &&
        don.trang_thai !== "DANG_GIAO" &&
        don.trang_thai !== "DANG_NHAP"
      ) {
        throw new Error("Đơn hàng phải được duyệt trước khi nhập kho");
      }

      // Process Items
      for (const item of danhSachHang) {
        // item: { id (detail_id), so_luong_nhap, don_gia (optional override) }

        // 1. Get Detail & Lock
        const ctRes = await client.query(
          `SELECT * FROM tm_don_hang_chi_tiet WHERE id = $1 AND so_don_hang = $2 FOR UPDATE`,
          [item.id, soPhieuCode],
        );

        if (!ctRes.rows.length) {
          console.error(
            `[nhapKho] Detail not found: id=${item.id}, so_don_hang=${soPhieuCode}`,
          );
          throw new Error(`Chi tiết đơn hàng không tồn tại (id: ${item.id})`);
        }
        const ct = ctRes.rows[0];

        const slNhap = Number(item.so_luong_nhap);
        if (slNhap <= 0) continue;

        if (ct.so_luong_da_giao + slNhap > ct.so_luong_dat) {
          throw new Error(
            `Số lượng nhập vượt quá số lượng đặt cho sản phẩm ${ct.ma_hang_hoa}`,
          );
        }

        const donGia = item.don_gia || ct.don_gia;
        const heSoDoi = Number(item.he_so_doi) || 1; // Default 1 if no conversion
        const slTonKho = slNhap * heSoDoi;
        const donGiaTonKho = donGia / heSoDoi;

        console.log(`[nhapKho] Processing item:`, {
          ma_hang_hoa: ct.ma_hang_hoa,
          ma_kho: don.ma_kho_nhap,
          slNhap,
          slTonKho,
          donGia,
          donGiaTonKho,
        });

        // 2. Verify ma_hang_hoa exists
        const hangHoaCheck = await client.query(
          `SELECT ma_hang_hoa FROM tm_hang_hoa WHERE ma_hang_hoa = $1`,
          [ct.ma_hang_hoa],
        );
        if (!hangHoaCheck.rows.length) {
          throw new Error(
            `Sản phẩm không tồn tại trong danh mục: ${ct.ma_hang_hoa}`,
          );
        }

        // 3. Verify ma_kho exists
        const khoCheck = await client.query(
          `SELECT ma_kho FROM sys_kho_new WHERE ma_kho = $1`,
          [don.ma_kho_nhap],
        );
        if (!khoCheck.rows.length) {
          throw new Error(`Kho không tồn tại: ${don.ma_kho_nhap}`);
        }

        // 4. Update Stock (Warehouse Service logic usually, but inline here for speed)
        await client.query(
          `INSERT INTO tm_hang_hoa_ton_kho (ma_hang_hoa, ma_kho, so_luong_ton, gia_von_binh_quan, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (ma_hang_hoa, ma_kho)
            DO UPDATE SET 
              so_luong_ton = tm_hang_hoa_ton_kho.so_luong_ton + $3,
              updated_at = CURRENT_TIMESTAMP`,
          [ct.ma_hang_hoa, don.ma_kho_nhap, slTonKho, donGiaTonKho],
        );

        // 5. Update Detail Delivered Qty (Tracks PO Unit)
        await client.query(
          `UPDATE tm_don_hang_chi_tiet 
           SET so_luong_da_giao = so_luong_da_giao + $1 
           WHERE id = $2`,
          [slNhap, ct.id],
        );

        // 6. Log History (Tracks Base Unit)
        await client.query(
          `INSERT INTO tm_hang_hoa_lich_su (
            ma_hang_hoa, loai_giao_dich, so_chung_tu, ngay_giao_dich,
            ma_kho_nhap, so_luong, don_gia, thanh_tien,
            nguoi_thuc_hien, dien_giai
          ) VALUES ($1, 'NHAP_KHO', $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8)`,
          [
            ct.ma_hang_hoa,
            soPhieuCode,
            don.ma_kho_nhap,
            slTonKho,
            donGiaTonKho,
            slNhap * donGia, // Total value remains the same
            nguoi_nhap,
            `Nhập ${slNhap} (quy đổi ${slTonKho}) ${ct.ma_hang_hoa} từ đơn ${soPhieuCode}`,
          ],
        );
      }

      /* 5. Ghi nhận công nợ đối tác cho lần nhập này */
      let tong_gia_tri_nhap = 0;
      for (const item of danhSachHang) {
        const ctRes = await client.query(
          "SELECT don_gia FROM tm_don_hang_chi_tiet WHERE id = $1",
          [item.id],
        );
        if (ctRes.rows.length) {
          tong_gia_tri_nhap +=
            Number(item.so_luong_nhap) *
            Number(item.don_gia || ctRes.rows[0].don_gia);
        }
      }

      if (tong_gia_tri_nhap > 0) {
        console.log(`[nhapKho] Recording debt:`, {
          ma_doi_tac: don.ma_ncc,
          so_tien: tong_gia_tri_nhap,
          so_hoa_don: soPhieuCode,
        });

        // Verify supplier exists
        const nccCheck = await client.query(
          `SELECT ma_doi_tac FROM dm_doi_tac WHERE ma_doi_tac = $1`,
          [don.ma_ncc],
        );
        if (!nccCheck.rows.length) {
          console.warn(
            `[nhapKho] Supplier not found: ${don.ma_ncc}, skipping debt recording`,
          );
        } else {
          await CongNoService.recordDoiTacDebt(client, {
            ma_doi_tac: don.ma_ncc,
            loai_cong_no: "PHAI_TRA",
            so_hoa_don: soPhieuCode,
            ngay_phat_sinh: new Date(),
            so_tien: tong_gia_tri_nhap,
            ghi_chu: `Nhập kho phụ tùng từ đơn ${soPhieuCode}`,
          });
        }
      }

      // Check Completion
      const checkDone = await client.query(
        `SELECT COUNT(*) as remaining 
         FROM tm_don_hang_chi_tiet 
         WHERE so_don_hang = $1 AND so_luong_da_giao < so_luong_dat`,
        [soPhieuCode],
      );

      if (parseInt(checkDone.rows[0].remaining) === 0) {
        await client.query(
          `UPDATE tm_don_hang SET trang_thai = 'HOAN_THANH', updated_at = NOW() WHERE so_don_hang = $1`,
          [soPhieuCode],
        );
      } else {
        await client.query(
          `UPDATE tm_don_hang SET trang_thai = 'DANG_GIAO', updated_at = NOW() WHERE so_don_hang = $1`,
          [soPhieuCode],
        );
      }

      await client.query("COMMIT");
      return { success: true, message: "Nhập kho thành công" };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // Lấy danh sách đơn hàng
  async getDanhSach(filters = {}) {
    let sql = `
      SELECT 
        d.id, d.so_don_hang as so_phieu, d.ngay_dat_hang, d.ma_ben_nhap as ma_kho_nhap, d.ma_ben_xuat as ma_ncc,
        d.tong_gia_tri as tong_tien, d.trang_thai, d.created_at as created_at, d.ghi_chu as dien_giai,
        d.created_by as nguoi_tao,
        u_tao.ho_ten as ten_nguoi_tao,
        k.ten_kho, kh.ten_doi_tac as ten_ncc
      FROM tm_don_hang d
      INNER JOIN sys_kho k ON d.ma_ben_nhap = k.ma_kho
      INNER JOIN dm_doi_tac kh ON d.ma_ben_xuat = kh.ma_doi_tac
      LEFT JOIN sys_user u_tao ON d.created_by::text = u_tao.id::text
      WHERE d.loai_don_hang = 'MUA_HANG'
    `;

    const params = [];

    if (filters.trang_thai) {
      params.push(filters.trang_thai);
      sql += ` AND d.trang_thai = $${params.length}`;
    }

    if (filters.ma_kho_nhap) {
      params.push(filters.ma_kho_nhap);
      sql += ` AND d.ma_ben_nhap = $${params.length}`;
    }

    sql += " ORDER BY d.ngay_dat_hang DESC, d.so_don_hang DESC";

    const result = await pool.query(sql, params);
    return result.rows;
  }

  // Lấy chi tiết đơn hàng
  async getChiTiet(ma_phieu) {
    const headerResult = await pool.query(
      `SELECT 
        d.*, d.so_don_hang as so_phieu, k.ten_kho, kh.ten_doi_tac as ten_ncc,
        d.created_by as nguoi_tao,
        u_tao.ho_ten as ten_nguoi_tao,
        d.nguoi_gui,
        u_gui.ho_ten as ten_nguoi_gui,
        d.nguoi_duyet,
        u_duyet.ho_ten as ten_nguoi_duyet,
        d.ngay_duyet
       FROM tm_don_hang d
       INNER JOIN sys_kho k ON d.ma_ben_nhap = k.ma_kho
       INNER JOIN dm_doi_tac kh ON d.ma_ben_xuat = kh.ma_doi_tac
       LEFT JOIN sys_user u_tao ON d.created_by::text = u_tao.id::text
       LEFT JOIN sys_user u_gui ON d.nguoi_gui::text = u_gui.id::text
       LEFT JOIN sys_user u_duyet ON d.nguoi_duyet::text = u_duyet.id::text
       WHERE d.so_don_hang = $1 
          OR (CASE WHEN $1 ~ '^\\d+$' THEN d.id = $1::int ELSE FALSE END)`,
      [ma_phieu],
    );

    if (!headerResult.rows[0]) {
      return null;
    }

    const soPhieu = headerResult.rows[0].so_don_hang;

    const detailResult = await pool.query(
      `SELECT 
        ct.*, 
        pt.ten_hang_hoa as ten_pt, 
        pt.don_vi_tinh, 
        ct.ma_hang_hoa as ma_pt, 
        ct.so_luong_dat as so_luong,
        (ct.so_luong_dat - ct.so_luong_da_giao) as so_luong_con_lai
       FROM tm_don_hang_chi_tiet ct
       LEFT JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
       WHERE ct.so_don_hang = $1 
       ORDER BY ct.stt`,
      [soPhieu],
    );

    return {
      ...headerResult.rows[0],
      chi_tiet: detailResult.rows,
    };
  }
  // Lấy chi tiết đơn hàng cho export
  async getAllDetails(filters = {}) {
    let sql = `
      SELECT 
        ct.*, 
        h.ngay_dat_hang as ngay_lap,
        h.ma_ben_nhap as ma_kho_nhap,
        pt.ten_hang_hoa as ten_pt,
        pt.don_vi_tinh
      FROM tm_don_hang_chi_tiet ct
      INNER JOIN tm_don_hang h ON ct.so_don_hang = h.so_don_hang
      LEFT JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
      WHERE h.loai_don_hang = 'MUA_HANG'
    `;
    const params = [];
    const result = await pool.query(sql, params);
    return result.rows;
  }
}

module.exports = new DonHangMuaService();
