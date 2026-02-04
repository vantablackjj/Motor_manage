const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");
const PhuTung = require("../models/PhuTung");
const CongNoService = require("./congNo.service");

class ChuyenKhoService {
  /* =====================================================
   * TẠO PHIẾU CHUYỂN KHO
   * ===================================================== */
  async taoPhieu(data) {
    const {
      so_phieu,
      ngay_chuyen_kho,
      ma_kho_xuat,
      ma_kho_nhap,
      nguoi_tao,
      dien_giai,
    } = data;

    if (ma_kho_xuat === ma_kho_nhap) {
      throw new Error("Kho xuất và kho nhập không được trùng nhau");
    }

    const result = await pool.query(
      `
      INSERT INTO tm_don_hang (
        so_don_hang,
        ngay_dat_hang,
        ma_ben_xuat,
        loai_ben_xuat,
        ma_ben_nhap,
        loai_ben_nhap,
        loai_don_hang,
        trang_thai,
        created_by,
        ghi_chu
      )
      VALUES ($1,$2,$3,'KHO',$4,'KHO','CHUYEN_KHO',$5,$6,$7)
      RETURNING *, so_don_hang as so_phieu
      `,
      [
        so_phieu,
        ngay_chuyen_kho,
        ma_kho_xuat,
        ma_kho_nhap,
        "NHAP",
        nguoi_tao,
        dien_giai,
      ],
    );

    return result.rows[0];
  }

  /* =====================================================
   * THÊM XE VÀO PHIẾU
   * ===================================================== */
  async themXe(so_phieu, data) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /* 1. Lấy thông tin phiếu */
      const phieuRes = await client.query(
        `
        SELECT so_don_hang as so_phieu, ma_ben_xuat as ma_kho_xuat, trang_thai
        FROM tm_don_hang
        WHERE so_don_hang = $1
        FOR UPDATE
        `,
        [so_phieu],
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu chuyển kho không tồn tại");
      }

      const phieu = phieuRes.rows[0];

      if (phieu.trang_thai !== "NHAP") {
        throw new Error("Chỉ được thêm mặt hàng khi phiếu ở trạng thái NHAP");
      }

      /* 2. Kiểm tra xe */
      const xeRes = await client.query(
        `
        SELECT s.ma_serial, s.ma_hang_hoa, s.ma_kho_hien_tai, s.trang_thai, s.locked, 
               COALESCE(s.gia_von, (SELECT gia_von_mac_dinh FROM tm_hang_hoa WHERE ma_hang_hoa = s.ma_hang_hoa), 0) as gia_nhap
        FROM tm_hang_hoa_serial s
        WHERE s.ma_serial = $1
        FOR UPDATE
        `,
        [data.xe_key],
      );

      if (xeRes.rowCount === 0) {
        throw new Error("Xe không tồn tại");
      }

      const xe = xeRes.rows[0];

      if (xe.ma_kho_hien_tai !== phieu.ma_kho_xuat) {
        throw new Error("Xe không thuộc kho xuất");
      }

      if (xe.locked === true) {
        throw new Error("Xe đang bị khóa");
      }

      if (xe.trang_thai !== "TON_KHO") {
        throw new Error("Chỉ được chuyển xe đang tồn kho");
      }

      /* 3. Lấy STT */
      const sttRes = await client.query(
        `
        SELECT COALESCE(MAX(stt),0) + 1 AS stt
        FROM tm_don_hang_chi_tiet
        WHERE so_don_hang = $1
        `,
        [so_phieu],
      );

      const stt = sttRes.rows[0].stt;

      /* 4. Ghi chi tiết (unified) */
      await client.query(
        `
        INSERT INTO tm_don_hang_chi_tiet (
          so_don_hang,
          stt,
          ma_hang_hoa,
          so_luong_dat,
          don_gia,
          yeu_cau_dac_biet
        )
        VALUES ($1,$2,$3,1,$4,$5)
        `,
        [
          so_phieu,
          stt,
          xe.ma_hang_hoa,
          xe.gia_nhap,
          JSON.stringify({ ma_serial: xe.ma_serial }),
        ],
      );

      /* 5. Khóa xe */
      await client.query(
        `
        UPDATE tm_hang_hoa_serial
        SET trang_thai = 'DANG_CHUYEN',
            locked = TRUE,
            ghi_chu = COALESCE(ghi_chu, '') || E'\nĐang chuyển theo phiếu: ' || $1
        WHERE ma_serial = $2
        `,
        [so_phieu, xe.ma_serial],
      );

      await client.query("COMMIT");
      return { success: true, stt };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /* =====================================================
   * THÊM PHỤ TÙNG
   * ===================================================== */
  async themPhuTung(so_phieu, chi_tiet) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const phieuRes = await client.query(
        `
        SELECT so_don_hang as so_phieu, ma_ben_xuat as ma_kho_xuat, trang_thai
        FROM tm_don_hang
        WHERE so_don_hang = $1
        FOR UPDATE
        `,
        [so_phieu],
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu không tồn tại");
      }

      if (phieuRes.rows[0].trang_thai !== "NHAP") {
        throw new Error("Không thể thêm mặt hàng khi phiếu đã gửi duyệt");
      }

      const { ma_pt, so_luong, don_gia } = chi_tiet;

      await PhuTung.lock(
        client,
        ma_pt,
        phieuRes.rows[0].ma_kho_xuat,
        so_phieu,
        "CHUYEN_KHO",
        so_luong,
        `Chuyển kho ${so_phieu}`,
      );

      const sttRes = await client.query(
        `
        SELECT COALESCE(MAX(stt),0)+1 AS stt
        FROM tm_don_hang_chi_tiet
        WHERE so_don_hang = $1
        `,
        [so_phieu],
      );

      await client.query(
        `
        INSERT INTO tm_don_hang_chi_tiet (
          so_don_hang, stt, ma_hang_hoa, so_luong_dat, don_gia
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [so_phieu, sttRes.rows[0].stt, ma_pt, so_luong, don_gia],
      );

      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /* =====================================================
   * TỪ CHỐI / HỦY PHIẾU
   * ===================================================== */
  async tuChoiDuyet(so_phieu, nguoi_huy, ly_do) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      /* 1. Kiểm tra phiếu */
      const phieuRes = await client.query(
        "SELECT * FROM tm_don_hang WHERE so_don_hang = $1 FOR UPDATE",
        [so_phieu],
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu không tồn tại");
      }

      const phieu = phieuRes.rows[0];

      // Check lịch sử để đảm bảo chưa xuất kho thật (hoặc cho phép hủy phiếu kẹt DA_DUYET)
      const lichSuRes = await client.query(
        "SELECT 1 FROM tm_hang_hoa_lich_su WHERE so_chung_tu = $1 LIMIT 1",
        [so_phieu],
      );

      const allowed =
        ["NHAP", "GUI_DUYET"].includes(phieu.trang_thai) ||
        (phieu.trang_thai === "DA_DUYET" && lichSuRes.rowCount === 0);

      if (!allowed) {
        throw new Error("Không thể hủy phiếu đã hoàn thành kho");
      }

      /* 2. Unlock Phụ tùng */
      await PhuTung.unlock(client, so_phieu);

      /* 3. Unlock Xe */
      const chiTietRes = await client.query(
        "SELECT yeu_cau_dac_biet FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1",
        [so_phieu],
      );

      for (const ct of chiTietRes.rows) {
        const ma_serial = ct.yeu_cau_dac_biet?.ma_serial;
        if (ma_serial) {
          await client.query(
            `UPDATE tm_hang_hoa_serial 
                  SET locked = FALSE, 
                      trang_thai = 'TON_KHO',
                      ghi_chu = REPLACE(ghi_chu, E'\nĐang chuyển theo phiếu: ' || $1, '')
                  WHERE ma_serial = $2`,
            [so_phieu, ma_serial],
          );
        }
      }

      /* 4. Update trạng thái */
      await client.query(
        `UPDATE tm_don_hang 
           SET trang_thai = 'DA_HUY', 
               ghi_chu = COALESCE(ghi_chu,'') || ' | Hủy bởi: ' || $2 || ', Lý do: ' || $3
           WHERE so_don_hang = $1`,
        [so_phieu, nguoi_huy, ly_do],
      );

      await client.query("COMMIT");
      return { success: true, message: "Hủy phiếu thành công" };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /* =====================================================
   * GỬI DUYỆT
   * ===================================================== */
  async guiDuyet(so_phieu, nguoi_gui) {
    const result = await pool.query(
      `
      UPDATE tm_don_hang
      SET trang_thai = 'GUI_DUYET',
          nguoi_gui = $2,
          ngay_gui = NOW()
      WHERE so_don_hang = $1
        AND trang_thai = 'NHAP'
      RETURNING *
      `,
      [so_phieu, nguoi_gui],
    );

    if (result.rowCount === 0) {
      throw new Error("Phiếu không hợp lệ để gửi duyệt");
    }

    return { success: true };
  }

  /* =====================================================
   * DUYỆT CHUYỂN KHO (Phát sinh phiếu kho và lịch sử)
   * ===================================================== */
  async pheDuyet(so_phieu, nguoi_duyet) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const phieuRes = await client.query(
        `
        SELECT so_don_hang, ma_ben_xuat as ma_kho_xuat, ma_ben_nhap as ma_kho_nhap, trang_thai
        FROM tm_don_hang
        WHERE so_don_hang = $1
        FOR UPDATE
        `,
        [so_phieu],
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu chuyển kho không tồn tại");
      }

      const phieu = phieuRes.rows[0];

      if (phieu.trang_thai !== "GUI_DUYET") {
        throw new Error(
          "Chỉ được duyệt phiếu đang ở trạng thái chờ duyệt (GUI_DUYET)",
        );
      }

      await client.query(
        `UPDATE tm_don_hang 
         SET trang_thai = 'DA_DUYET', 
             nguoi_duyet = $2, 
             ngay_duyet = NOW()
         WHERE so_don_hang = $1`,
        [so_phieu, nguoi_duyet],
      );

      await client.query("COMMIT");
      return { success: true, message: "Duyệt phiếu thành công" };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /* =====================================================
   * NHẬP KHO (Thực hiện chuyển đổi hàng hóa - Hỗ trợ nhập nhiều lần)
   * ===================================================== */
  async nhapKho(so_phieu, nguoi_nhap, danh_sach_nhap) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      /* 1. Kiểm tra phiếu */
      const phieuRes = await client.query(
        `
        SELECT so_don_hang, ma_ben_xuat as ma_kho_xuat, ma_ben_nhap as ma_kho_nhap, trang_thai
        FROM tm_don_hang
        WHERE so_don_hang = $1
        FOR UPDATE
        `,
        [so_phieu],
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu chuyển kho không tồn tại");
      }

      const phieu = phieuRes.rows[0];

      // Cho phép nhập khi DA_DUYET (có thể nhập nhiều lần)
      if (phieu.trang_thai !== "DA_DUYET") {
        throw new Error("Chỉ được nhập kho phiếu đã được duyệt");
      }

      /* 2. Lấy tất cả chi tiết */
      const chiTietRes = await client.query(
        `SELECT * FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1 FOR UPDATE`,
        [so_phieu],
      );

      const chiTietMap = new Map(chiTietRes.rows.map((ct) => [ct.stt, ct]));

      /* 3. Xử lý từng item trong danh sách nhập */
      for (const item of danh_sach_nhap) {
        const ct = chiTietMap.get(item.stt);
        if (!ct) {
          throw new Error(`Không tìm thấy chi tiết STT ${item.stt}`);
        }

        const so_luong_con_lai = ct.so_luong_dat - (ct.so_luong_da_giao || 0);

        if (so_luong_con_lai <= 0) {
          throw new Error(`STT ${item.stt}: Đã nhập đủ số lựợng`);
        }

        if (item.so_luong_nhap > so_luong_con_lai) {
          throw new Error(
            `STT ${item.stt}: Số lượng nhập (${item.so_luong_nhap}) vượt quá số lượng còn lại (${so_luong_con_lai})`,
          );
        }

        const ma_serial = item.ma_serial || ct.yeu_cau_dac_biet?.ma_serial;

        if (ma_serial) {
          // Xử lý xe (phải nhập đúng 1 chiếc)
          if (item.so_luong_nhap !== 1) {
            throw new Error("Mỗi lần chỉ nhập được 1 xe");
          }

          // Kiểm tra xe
          const xeCheck = await client.query(
            `SELECT ma_kho_hien_tai, locked FROM tm_hang_hoa_serial WHERE ma_serial = $1`,
            [ma_serial],
          );

          if (xeCheck.rowCount === 0) {
            throw new Error(`Xe ${ma_serial} không tồn tại`);
          }

          if (xeCheck.rows[0].ma_kho_hien_tai !== phieu.ma_kho_xuat) {
            throw new Error(`Xe ${ma_serial} không thuộc kho xuất`);
          }

          // Chuyển xe
          await client.query(
            `UPDATE tm_hang_hoa_serial
             SET ma_kho_hien_tai = $1,
                 trang_thai = 'TON_KHO',
                 locked = FALSE,
                 updated_at = NOW()
             WHERE ma_serial = $2`,
            [phieu.ma_kho_nhap, ma_serial],
          );

          // Ghi lịch sử
          await client.query(
            `INSERT INTO tm_hang_hoa_lich_su (
                ma_hang_hoa, ma_serial, loai_giao_dich, so_chung_tu, ngay_giao_dich,
                ma_kho_xuat, ma_kho_nhap, so_luong, don_gia, thanh_tien, nguoi_thuc_hien
            )
            VALUES ($1, $2, 'CHUYEN_KHO', $3, NOW(), $4, $5, -1, $6, $6, $7)`,
            [
              ct.ma_hang_hoa,
              ma_serial,
              so_phieu,
              phieu.ma_kho_xuat,
              phieu.ma_kho_nhap,
              ct.don_gia,
              nguoi_nhap,
            ],
          );
        } else {
          // Xử lý phụ tùng
          const so_luong_nhap = item.so_luong_nhap;

          // Trừ kho xuất
          await client.query(
            `UPDATE tm_hang_hoa_ton_kho
             SET so_luong_ton = so_luong_ton - $1,
                 so_luong_khoa = so_luong_khoa - $1,
                 updated_at = NOW()
             WHERE ma_hang_hoa = $2 AND ma_kho = $3`,
            [so_luong_nhap, ct.ma_hang_hoa, phieu.ma_kho_xuat],
          );

          // Cộng kho nhập
          await client.query(
            `INSERT INTO tm_hang_hoa_ton_kho (ma_hang_hoa, ma_kho, so_luong_ton, so_luong_khoa, so_luong_toi_thieu, updated_at)
             VALUES ($1, $2, $3, 0, 0, NOW())
             ON CONFLICT (ma_hang_hoa, ma_kho) DO UPDATE SET 
             so_luong_ton = tm_hang_hoa_ton_kho.so_luong_ton + EXCLUDED.so_luong_ton,
             updated_at = NOW()`,
            [ct.ma_hang_hoa, phieu.ma_kho_nhap, so_luong_nhap],
          );

          // Ghi lịch sử
          const thanh_tien = so_luong_nhap * ct.don_gia;
          await client.query(
            `INSERT INTO tm_hang_hoa_lich_su (
                ma_hang_hoa, loai_giao_dich, so_chung_tu, ngay_giao_dich,
                ma_kho_xuat, ma_kho_nhap, so_luong, don_gia, thanh_tien, nguoi_thuc_hien
            )
            VALUES ($1, 'CHUYEN_KHO', $2, NOW(), $3, $4, $5, $6, $7, $8)`,
            [
              ct.ma_hang_hoa,
              so_phieu,
              phieu.ma_kho_xuat,
              phieu.ma_kho_nhap,
              -so_luong_nhap,
              ct.don_gia,
              -thanh_tien,
              nguoi_nhap,
            ],
          );
        }

        // Cập nhật số lượng đã giao
        await client.query(
          `UPDATE tm_don_hang_chi_tiet 
           SET so_luong_da_giao = COALESCE(so_luong_da_giao, 0) + $1
           WHERE so_don_hang = $2 AND stt = $3`,
          [item.so_luong_nhap, so_phieu, item.stt],
        );

        // Cập nhật số lượng trong Memory để loop sau (nếu có trùng STT) thấy được
        ct.so_luong_da_giao = (ct.so_luong_da_giao || 0) + item.so_luong_nhap;
      }

      // Unlock phụ tùng đã nhập đủ
      for (const item of danh_sach_nhap) {
        const ct = chiTietMap.get(item.stt);
        const so_luong_da_giao_moi =
          (ct.so_luong_da_giao || 0) + item.so_luong_nhap;

        if (
          so_luong_da_giao_moi >= ct.so_luong_dat &&
          !ct.yeu_cau_dac_biet?.ma_serial
        ) {
          // Unlock phụ tùng đã nhập đủ
          await client.query(
            `DELETE FROM tm_hang_hoa_khoa WHERE ma_hang_hoa = $1 AND ma_kho = $2 AND so_phieu = $3`,
            [ct.ma_hang_hoa, phieu.ma_kho_xuat, so_phieu],
          );
        }
      }

      /* 4. Ghi nhận công nợ nội bộ cho lần nhập này */
      let tong_gia_tri_nhap = 0;
      for (const item of danh_sach_nhap) {
        const ct = chiTietMap.get(item.stt);
        tong_gia_tri_nhap += Number(item.so_luong_nhap) * Number(ct.don_gia);
      }

      if (tong_gia_tri_nhap > 0) {
        await CongNoService.recordInternalDebt(client, {
          ma_kho_no: phieu.ma_kho_nhap,
          ma_kho_co: phieu.ma_kho_xuat,
          so_phieu_chuyen_kho: so_phieu,
          ngay_phat_sinh: new Date(),
          so_tien: tong_gia_tri_nhap,
          ghi_chu: `Nhập kho từ phiếu ${so_phieu}`,
        });
      }

      /* 5. Kiểm tra xem đã nhập đủ chưa */
      const checkComplete = await client.query(
        `SELECT COUNT(*) as chua_du
         FROM tm_don_hang_chi_tiet
         WHERE so_don_hang = $1 
           AND COALESCE(so_luong_da_giao, 0) < so_luong_dat`,
        [so_phieu],
      );

      const hoan_thanh = checkComplete.rows[0].chua_du === "0";

      // Cập nhật trạng thái phiếu - Chỉ chuyển HOAN_THANH khi đã nhập đủ
      // Nếu chưa đủ, giữ nguyên DA_DUYET để có thể nhập tiếp
      if (hoan_thanh) {
        await client.query(
          `UPDATE tm_don_hang SET trang_thai = 'HOAN_THANH' WHERE so_don_hang = $1`,
          [so_phieu],
        );
      }

      await client.query("COMMIT");

      return {
        success: true,
        message: hoan_thanh
          ? "Nhập kho hoàn thành"
          : "Nhập kho một phần thành công. Phiếu vẫn ở trạng thái DA_DUYET, bạn có thể tiếp tục nhập.",
        hoan_thanh,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getDanhSach(filters = {}) {
    const { trang_thai, ma_kho_xuat, ma_kho_nhap, tu_ngay, den_ngay } = filters;
    const conditions = ["h.loai_don_hang = 'CHUYEN_KHO'"];
    const values = [];
    let idx = 1;

    if (trang_thai) {
      conditions.push(`h.trang_thai = $${idx++}`);
      values.push(trang_thai);
    }
    if (ma_kho_xuat) {
      conditions.push(`h.ma_ben_xuat = $${idx++}`);
      values.push(ma_kho_xuat);
    }
    if (ma_kho_nhap) {
      conditions.push(`h.ma_ben_nhap = $${idx++}`);
      values.push(ma_kho_nhap);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const sql = `
        SELECT 
            h.so_don_hang as so_phieu, 
            h.ngay_dat_hang as ngay_chuyen_kho, 
            h.ma_ben_xuat as ma_kho_xuat, 
            h.ma_ben_nhap as ma_kho_nhap, 
            h.trang_thai, 
            h.created_by as nguoi_tao,
            COALESCE(u_tao.ho_ten, u_tao.username) as ten_nguoi_tao,
            h.ghi_chu as dien_giai
        FROM tm_don_hang h
        LEFT JOIN sys_user u_tao ON h.created_by::text = u_tao.id::text
        ${whereClause} 
        ORDER BY h.ngay_dat_hang DESC, h.so_don_hang DESC`;

    const result = await pool.query(sql, values);
    return result.rows;
  }

  async getChiTiet(ma_phieu) {
    const phieuRes = await pool.query(
      `SELECT 
        h.*, 
        h.so_don_hang as so_phieu, 
        h.ngay_dat_hang as ngay_chuyen_kho, 
        h.ma_ben_xuat as ma_kho_xuat, 
        h.ma_ben_nhap as ma_kho_nhap,
        h.created_by as nguoi_tao,
        COALESCE(u_tao.ho_ten, u_tao.username) as ten_nguoi_tao,
        h.nguoi_gui,
        COALESCE(u_gui.ho_ten, u_gui.username) as ten_nguoi_gui,
        h.nguoi_duyet,
        COALESCE(u_duyet.ho_ten, u_duyet.username) as ten_nguoi_duyet,
        h.ngay_duyet,
        COALESCE(kx.ten_kho, kx.ma_kho) as ten_kho_xuat, kx.dia_chi as dia_chi_kho_xuat, kx.dien_thoai as sdt_kho_xuat,
        COALESCE(kn.ten_kho, kn.ma_kho) as ten_kho_nhap, kn.dia_chi as dia_chi_kho_nhap, kn.dien_thoai as sdt_kho_nhap
      FROM tm_don_hang h
      LEFT JOIN sys_user u_tao ON h.created_by::text = u_tao.id::text
      LEFT JOIN sys_user u_gui ON h.nguoi_gui::text = u_gui.id::text
      LEFT JOIN sys_user u_duyet ON h.nguoi_duyet::text = u_duyet.id::text
      LEFT JOIN sys_kho kx ON h.ma_ben_xuat = kx.ma_kho
      LEFT JOIN sys_kho kn ON h.ma_ben_nhap = kn.ma_kho
      WHERE h.so_don_hang = $1`,
      [ma_phieu],
    );

    if (phieuRes.rowCount === 0) return null;

    const detailsRes = await pool.query(
      `SELECT
          ct.stt, (ct.yeu_cau_dac_biet->>'ma_serial') as xe_key, 
          ct.ma_hang_hoa as ma_pt, ct.so_luong_dat as so_luong,
          ct.so_luong_da_giao,
          (ct.so_luong_dat - COALESCE(ct.so_luong_da_giao, 0)) as so_luong_con_lai,
          ct.don_gia, ct.thanh_tien,
          pt.ten_hang_hoa as ten_pt, pt.don_vi_tinh
       FROM tm_don_hang_chi_tiet ct
       LEFT JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
       WHERE ct.so_don_hang = $1
       ORDER BY ct.stt`,
      [ma_phieu],
    );

    const chi_tiet_xe = detailsRes.rows.filter((r) => r.xe_key);
    const chi_tiet_phu_tung = detailsRes.rows.filter((r) => !r.xe_key);

    return {
      phieu: phieuRes.rows[0],
      chi_tiet_xe,
      chi_tiet_phu_tung,
    };
  }

  /* =====================================================
   * LẤY DỮ LIỆU EXPORT XE
   * ===================================================== */
  async getAllTransferXe(filters = {}) {
    const queryStr = `
      SELECT 
        h.so_don_hang as ma_phieu,
        h.created_at,
        (ct.yeu_cau_dac_biet->>'ma_serial') as xe_key,
        h.ma_ben_xuat as tu_ma_kho,
        h.ma_ben_nhap as den_ma_kho,
        COALESCE(u.ho_ten, u.username) as nguoi_tao_ten
      FROM tm_don_hang_chi_tiet ct
      JOIN tm_don_hang h ON ct.so_don_hang = h.so_don_hang
      LEFT JOIN sys_user u ON h.created_by::text = u.id::text
      WHERE h.loai_don_hang = 'CHUYEN_KHO'
        AND (ct.yeu_cau_dac_biet->>'ma_serial') IS NOT NULL
      ORDER BY h.created_at DESC
    `;
    const result = await pool.query(queryStr);
    return result.rows;
  }

  /* =====================================================
   * LẤY DỮ LIỆU EXPORT PHỤ TÙNG
   * ===================================================== */
  async getAllTransferPT(filters = {}) {
    const queryStr = `
      SELECT 
        h.so_don_hang as ma_phieu,
        h.created_at,
        ct.ma_hang_hoa as ma_pt,
        hh.ten_hang_hoa as ten_pt,
        ct.so_luong_dat as so_luong,
        h.ma_ben_xuat as tu_ma_kho,
        h.ma_ben_nhap as den_ma_kho
      FROM tm_don_hang_chi_tiet ct
      JOIN tm_don_hang h ON ct.so_don_hang = h.so_don_hang
      LEFT JOIN tm_hang_hoa hh ON ct.ma_hang_hoa = hh.ma_hang_hoa
      WHERE h.loai_don_hang = 'CHUYEN_KHO'
        AND (ct.yeu_cau_dac_biet->>'ma_serial') IS NULL
      ORDER BY h.created_at DESC
    `;
    const result = await pool.query(queryStr);
    return result.rows;
  }
}

module.exports = new ChuyenKhoService();
