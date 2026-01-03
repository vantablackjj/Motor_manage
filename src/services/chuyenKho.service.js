const { pool } = require("../config/database");
const { TRANG_THAI } = require("../config/constants");
const PhuTung = require("../models/PhuTung");

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
      INSERT INTO tm_chuyen_kho (
        so_phieu,
        ngay_chuyen_kho,
        ma_kho_xuat,
        ma_kho_nhap,
        nguoi_tao,
        dien_giai,
        trang_thai
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        so_phieu,
        ngay_chuyen_kho,
        ma_kho_xuat,
        ma_kho_nhap,
        nguoi_tao,
        dien_giai,
        TRANG_THAI.NHAP,
      ]
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

      /* 1. Khóa phiếu */
      const phieuRes = await client.query(
        `
        SELECT so_phieu, ma_kho_xuat, trang_thai
        FROM tm_chuyen_kho
        WHERE so_phieu = $1
        FOR UPDATE
        `,
        [so_phieu]
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu chuyển kho không tồn tại");
      }

      const phieu = phieuRes.rows[0];

      if (phieu.trang_thai !== TRANG_THAI.NHAP) {
        throw new Error("Chỉ được thêm xe khi phiếu ở trạng thái NHAP");
      }

      /* 2. Khóa xe */
      const xeRes = await client.query(
        `
        SELECT xe_key, ma_kho_hien_tai, trang_thai, locked
        FROM tm_xe_thuc_te
        WHERE xe_key = $1
        FOR UPDATE
        `,
        [data.xe_key]
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
        FROM tm_chuyen_kho_xe
        WHERE ma_phieu = $1
        `,
        [so_phieu]
      );

      const stt = sttRes.rows[0].stt;

      /* 4. Ghi chi tiết xe */
      await client.query(
        `
        INSERT INTO tm_chuyen_kho_xe (
          ma_phieu,
          stt,
          xe_key,
          ma_loai_xe,
          ma_mau,
          so_may,
          gia_tri_chuyen_kho,
          trang_thai
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,'CHO_XUAT')
        `,
        [
          so_phieu,
          stt,
          xe.xe_key,
          data.ma_loai_xe,
          data.ma_mau,
          data.so_may,
          data.gia_tri_chuyen_kho,
        ]
      );

      /* 5. Khóa xe */
      await client.query(
        `
        UPDATE tm_xe_thuc_te
        SET trang_thai = 'DANG_CHUYEN',
            locked = TRUE,
            locked_reason = 'CHUYEN_KHO',
            locked_at = NOW()
        WHERE xe_key = $1
        `,
        [xe.xe_key]
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
        SELECT trang_thai, ma_kho_xuat
        FROM tm_chuyen_kho
        WHERE so_phieu = $1
        FOR UPDATE
        `,
        [so_phieu]
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu không tồn tại");
      }

      if (phieuRes.rows[0].trang_thai !== TRANG_THAI.NHAP) {
        throw new Error("Không thể thêm phụ tùng khi phiếu đã gửi duyệt");
      }

      const { ma_pt, ten_pt, don_vi_tinh, so_luong, don_gia } = chi_tiet;
      const thanh_tien = so_luong * don_gia;

      await PhuTung.lock(
        client,
        ma_pt,
        phieuRes.rows[0].ma_kho_xuat,
        so_phieu,
        "CHUYEN_KHO",
        so_luong,
        `Chuyển kho ${so_phieu}`
      );

      const sttRes = await client.query(
        `
        SELECT COALESCE(MAX(stt),0)+1 AS stt
        FROM tm_chuyen_kho_phu_tung
        WHERE ma_phieu = $1
        `,
        [so_phieu]
      );

      await client.query(
        `
        INSERT INTO tm_chuyen_kho_phu_tung (
          ma_phieu, stt, ma_pt, ten_pt,
          don_vi_tinh, so_luong, don_gia, thanh_tien
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          so_phieu,
          sttRes.rows[0].stt,
          ma_pt,
          ten_pt,
          don_vi_tinh,
          so_luong,
          don_gia,
          thanh_tien,
        ]
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
   * GỬI DUYỆT
   * ===================================================== */
  async guiDuyet(so_phieu, nguoi_gui) {
    const result = await pool.query(
      `
      UPDATE tm_chuyen_kho
      SET trang_thai = $1,
          nguoi_gui = $2,
          ngay_gui = NOW()
      WHERE so_phieu = $3
        AND trang_thai = $4
      RETURNING *
      `,
      [TRANG_THAI.GUI_DUYET, nguoi_gui, so_phieu, TRANG_THAI.NHAP]
    );

    if (result.rowCount === 0) {
      throw new Error("Phiếu không hợp lệ để gửi duyệt");
    }

    return { success: true };
  }

  /* =====================================================
   * DUYỆT CHUYỂN KHO (XE + PHỤ TÙNG)
   * ===================================================== */
  async pheDuyet(so_phieu, nguoi_duyet) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /* =====================================================
       * 1. KHÓA PHIẾU VÀ KIỂM TRA
       * ===================================================== */
      const phieuRes = await client.query(
        `
        SELECT so_phieu, ma_kho_xuat, ma_kho_nhap, trang_thai
        FROM tm_chuyen_kho
        WHERE so_phieu = $1
        FOR UPDATE
        `,
        [so_phieu]
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu chuyển kho không tồn tại");
      }

      const phieu = phieuRes.rows[0];

      if (phieu.trang_thai !== TRANG_THAI.GUI_DUYET) {
        throw new Error("Phiếu chưa ở trạng thái gửi duyệt");
      }

      let tong_gia_tri_xe = 0;
      let tong_gia_tri_pt = 0;

      /* =====================================================
       * 2. XỬ LÝ XE
       * ===================================================== */
      const xeRes = await client.query(
        `
        SELECT xe_key, gia_tri_chuyen_kho
        FROM tm_chuyen_kho_xe
        WHERE ma_phieu = $1
        FOR UPDATE
        `,
        [so_phieu]
      );

      for (const xe of xeRes.rows) {
        // Cộng tổng giá trị
        tong_gia_tri_xe += Number(xe.gia_tri_chuyen_kho || 0);

        // 2.1. Cập nhật xe thực tế
        await client.query(
          `
          UPDATE tm_xe_thuc_te
          SET ma_kho_hien_tai = $1,
              trang_thai = 'TON_KHO',
              locked = FALSE,
              locked_reason = NULL,
              locked_at = NULL
          WHERE xe_key = $2
          `,
          [phieu.ma_kho_nhap, xe.xe_key]
        );

        // 2.2. Cập nhật trạng thái chi tiết xe
        await client.query(
          `
          UPDATE tm_chuyen_kho_xe
          SET trang_thai = 'DA_CHUYEN'
          WHERE ma_phieu = $1 AND xe_key = $2
          `,
          [so_phieu, xe.xe_key]
        );

        // 2.3. Ghi lịch sử xe (Nếu cần, nhưng ERD đã có tm_xe_lich_su, ta nên insert vào đó)
        await client.query(
          `
            INSERT INTO tm_xe_lich_su (
                xe_key, loai_giao_dich, so_chung_tu, ngay_giao_dich,
                ma_kho_xuat, ma_kho_nhap, gia_tri, nguoi_thuc_hien
            )
            VALUES ($1, 'CHUYEN_KHO', $2, NOW(), $3, $4, $5, $6)
            `,
          [
            xe.xe_key,
            so_phieu,
            phieu.ma_kho_xuat,
            phieu.ma_kho_nhap,
            xe.gia_tri_chuyen_kho,
            nguoi_duyet,
          ]
        );
      }

      /* =====================================================
       * 3. XỬ LÝ PHỤ TÙNG
       * ===================================================== */
      const ptRes = await client.query(
        `
        SELECT ma_pt, so_luong, don_gia, thanh_tien
        FROM tm_chuyen_kho_phu_tung
        WHERE ma_phieu = $1
        FOR UPDATE
        `,
        [so_phieu]
      );

      for (const pt of ptRes.rows) {
        // Cộng tổng giá trị
        tong_gia_tri_pt += Number(pt.thanh_tien || 0);

        /* 3.1. Trừ tồn kho kho xuất */
        await client.query(
          `
          UPDATE tm_phu_tung_ton_kho
          SET so_luong = so_luong - $1,
              so_luong_khoa = so_luong_khoa - $1
          WHERE ma_pt = $2 AND ma_kho = $3
          `,
          [pt.so_luong, pt.ma_pt, phieu.ma_kho_xuat]
        );

        /* 3.2. Cộng tồn kho kho nhập */
        // Kiểm tra xem đã có record tồn kho chưa
        const checkTonKho = await client.query(
          `SELECT id FROM tm_phu_tung_ton_kho WHERE ma_pt = $1 AND ma_kho = $2`,
          [pt.ma_pt, phieu.ma_kho_nhap]
        );

        if (checkTonKho.rowCount > 0) {
          await client.query(
            `UPDATE tm_phu_tung_ton_kho SET so_luong = so_luong + $1 WHERE ma_pt = $2 AND ma_kho = $3`,
            [pt.so_luong, pt.ma_pt, phieu.ma_kho_nhap]
          );
        } else {
          await client.query(
            `INSERT INTO tm_phu_tung_ton_kho (ma_pt, ma_kho, so_luong, so_luong_khoa, so_luong_kha_dung, so_luong_toi_thieu, ngay_cap_nhat)
                 VALUES ($1, $2, $3, 0, $3, 0, NOW())`,
            [pt.ma_pt, phieu.ma_kho_nhap, pt.so_luong]
          );
        }

        /* 3.3. Unlock phụ tùng (Xóa record trong tm_phu_tung_khoa) */
        // Lưu ý: PhuTung.unlock có thể cần chỉnh sửa để phù hợp logic mới, nhưng ở đây ta gọi trực tiếp SQL cho chắc chắn
        await client.query(
          `DELETE FROM tm_phu_tung_khoa WHERE ma_pt = $1 AND ma_kho = $2 AND so_phieu = $3`,
          [pt.ma_pt, phieu.ma_kho_xuat, so_phieu]
        );

        /* 3.4. Cập nhật trạng thái chi tiết phụ tùng */
        await client.query(
          `
          UPDATE tm_chuyen_kho_phu_tung
          SET trang_thai = 'DA_CHUYEN'
          WHERE ma_phieu = $1 AND ma_pt = $2
          `,
          [so_phieu, pt.ma_pt]
        );

        // 3.5. Ghi lịch sử phụ tùng
        await client.query(
          `
            INSERT INTO tm_phu_tung_lich_su (
                ma_pt, loai_giao_dich, so_chung_tu, ngay_giao_dich,
                ma_kho_xuat, ma_kho_nhap, so_luong, don_gia, thanh_tien
            )
            VALUES ($1, 'CHUYEN_KHO', $2, NOW(), $3, $4, $5, $6, $7)
            `,
          [
            pt.ma_pt,
            so_phieu,
            phieu.ma_kho_xuat,
            phieu.ma_kho_nhap,
            pt.so_luong,
            pt.don_gia,
            pt.thanh_tien,
          ]
        );
      }

      /* =====================================================
       * 4. TẠO PHIẾU XUẤT / NHẬP KHO & CÔNG NỢ
       * ===================================================== */
      const tong_gia_tri = tong_gia_tri_xe + tong_gia_tri_pt;

      // Tạo mã phiếu xuất/nhập dựa trên số phiếu chuyển (Simplify)
      const so_phieu_xuat = `PX-${so_phieu}`;
      const so_phieu_nhap = `PN-${so_phieu}`;

      // 4.1. Tạo Phiếu Xuất
      await client.query(
        `
          INSERT INTO tm_phieu_xuat_kho (
              so_phieu, ngay_xuat, ma_kho, loai_phieu, 
              so_phieu_chuyen_kho, nguoi_xuat, tong_gia_tri
          ) VALUES ($1, NOW(), $2, 'XUAT_CHUYEN_KHO', $3, $4, $5)
          `,
        [so_phieu_xuat, phieu.ma_kho_xuat, so_phieu, nguoi_duyet, tong_gia_tri]
      );

      // 4.2. Tạo Phiếu Nhập
      await client.query(
        `
          INSERT INTO tm_phieu_nhap_kho (
              so_phieu, ngay_nhap, ma_kho, loai_phieu,
              so_phieu_chuyen_kho, nguoi_nhan, tong_gia_tri
          ) VALUES ($1, NOW(), $2, 'NHAP_CHUYEN_KHO', $3, $4, $5)
          `,
        [so_phieu_nhap, phieu.ma_kho_nhap, so_phieu, nguoi_duyet, tong_gia_tri]
      );

      // 4.3. Ghi nhận Công Nợ (Kho Nhập nợ Kho Xuất)
      // Thêm chi tiết công nợ
      await client.query(
        `
          INSERT INTO tm_cong_no_chi_tiet (
              so_phieu_chuyen_kho, ma_kho_no, ma_kho_co,
              ngay_phat_sinh, so_tien, da_thanh_toan, con_lai,
              trang_thai, han_thanh_toan, ghi_chu
          ) VALUES ($1, $2, $3, NOW(), $4, 0, $4, 'CHUA_TT', NULL, 'Phát sinh từ chuyển kho')
          `,
        [so_phieu, phieu.ma_kho_nhap, phieu.ma_kho_xuat, tong_gia_tri]
      );

      // Cập nhật tổng công nợ (tm_cong_no_kho)
      // Upsert: Nếu chưa có thì insert, có rồi thì update
      await client.query(
        `
          INSERT INTO tm_cong_no_kho (ma_kho_no, ma_kho_co, tong_no, tong_da_tra, con_lai, ngay_cap_nhat)
          VALUES ($1, $2, $3, 0, $3, NOW())
          ON CONFLICT (ma_kho_no, ma_kho_co)
          DO UPDATE SET 
              tong_no = tm_cong_no_kho.tong_no + EXCLUDED.tong_no,
              con_lai = tm_cong_no_kho.con_lai + EXCLUDED.con_lai,
              ngay_cap_nhat = NOW()
          `,
        [phieu.ma_kho_nhap, phieu.ma_kho_xuat, tong_gia_tri]
      );

      /* =====================================================
       * 5. CẬP NHẬT TRẠNG THÁI PHIẾU CHUYỂN
       * ===================================================== */
      await client.query(
        `
        UPDATE tm_chuyen_kho
        SET trang_thai = $1,
            nguoi_duyet = $2,
            ngay_duyet = NOW(),
            so_phieu_xuat = $3,
            so_phieu_nhap = $4
        WHERE so_phieu = $5
        `,
        [
          TRANG_THAI.DA_DUYET,
          nguoi_duyet,
          so_phieu_xuat,
          so_phieu_nhap,
          so_phieu,
        ]
      );

      await client.query("COMMIT");
      return {
        success: true,
        message: "Duyệt chuyển kho thành công",
        so_phieu_xuat,
        so_phieu_nhap,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  async tuChoiDuyet(so_phieu, nguoi_tu_choi, ly_do) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /* =====================================================
       * 1. KHÓA PHIẾU
       * ===================================================== */
      const phieuRes = await client.query(
        `
      SELECT so_phieu, ma_kho_xuat, trang_thai
      FROM tm_chuyen_kho
      WHERE so_phieu = $1
      FOR UPDATE
      `,
        [so_phieu]
      );

      if (phieuRes.rowCount === 0) {
        throw new Error("Phiếu chuyển kho không tồn tại");
      }

      const phieu = phieuRes.rows[0];

      if (phieu.trang_thai !== TRANG_THAI.GUI_DUYET) {
        throw new Error("Phiếu không ở trạng thái gửi duyệt");
      }

      /* =====================================================
       * 2. HOÀN TÁC XE
       * ===================================================== */
      const xeRes = await client.query(
        `
      SELECT xe_key
      FROM tm_chuyen_kho_xe
      WHERE ma_phieu = $1
      FOR UPDATE
      `,
        [so_phieu]
      );

      for (const xe of xeRes.rows) {
        // 2.1. Mở khóa xe, đưa về tồn kho kho xuất
        await client.query(
          `
        UPDATE tm_xe_thuc_te
        SET trang_thai = 'TON_KHO',
            locked = FALSE,
            locked_reason = NULL,
            locked_at = NULL,
            locked_by=NULL
        WHERE xe_key = $1
        `,
          [xe.xe_key]
        );

        // 2.2. Cập nhật trạng thái chi tiết xe
        await client.query(
          `
        UPDATE tm_chuyen_kho_xe
        SET trang_thai = 'TU_CHOI'
        WHERE ma_phieu = $1 AND xe_key = $2
        `,
          [so_phieu, xe.xe_key]
        );
      }

      /* =====================================================
       * 3. HOÀN TÁC PHỤ TÙNG
       * ===================================================== */
      const ptRes = await client.query(
        `
      SELECT ma_pt
      FROM tm_chuyen_kho_phu_tung
      WHERE ma_phieu = $1
      FOR UPDATE
      `,
        [so_phieu]
      );

      for (const pt of ptRes.rows) {
        await PhuTung.unlock(
          pt.ma_pt,
          phieu.ma_kho_xuat,
          so_phieu,
          "CHUYEN_KHO"
        );

        await client.query(
          `
        UPDATE tm_chuyen_kho_phu_tung
        SET trang_thai = 'TU_CHOI'
        WHERE ma_phieu = $1 AND ma_pt = $2
        `,
          [so_phieu, pt.ma_pt]
        );
      }

      /* =====================================================
       * 4. CẬP NHẬT PHIẾU
       * ===================================================== */
      await client.query(
        `
      UPDATE tm_chuyen_kho
      SET trang_thai = $1,
          nguoi_duyet = $2,
          dien_giai = $3,
          ngay_duyet = NOW()
      WHERE so_phieu = $4
      `,
        [TRANG_THAI.TU_CHOI, nguoi_tu_choi, ly_do || null, so_phieu]
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
  async getDanhSach(filters = {}) {
    const { trang_thai, ma_kho_xuat, ma_kho_nhap, tu_ngay, den_ngay } = filters;
    const conditions = [];
    const values = [];
    let idx = 1;

    // Xây dựng điều kiện lọc động
    if (trang_thai) {
      conditions.push(`ck.trang_thai = $${idx++}`);
      values.push(trang_thai);
    }
    if (ma_kho_xuat) {
      conditions.push(`ck.ma_kho_xuat = $${idx++}`);
      values.push(ma_kho_xuat);
    }
    if (ma_kho_nhap) {
      conditions.push(`ck.ma_kho_nhap = $${idx++}`);
      values.push(ma_kho_nhap);
    }
    if (tu_ngay) {
      conditions.push(`ck.ngay_chuyen_kho >= $${idx++}`);
      values.push(tu_ngay);
    }
    if (den_ngay) {
      conditions.push(`ck.ngay_chuyen_kho <= $${idx++}`);
      values.push(den_ngay);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
        SELECT 
            ck.so_phieu, 
            ck.ngay_chuyen_kho, 
            ck.ma_kho_xuat, 
            ck.ma_kho_nhap, 
            ck.trang_thai, 
            ck.nguoi_tao, 
            ck.nguoi_duyet, 
            ck.ngay_duyet, 
            ck.dien_giai, 
            COUNT(ct.id) AS so_dong, 
            COALESCE(SUM(ct.thanh_tien), 0) AS tong_gia_tri 
        FROM tm_chuyen_kho ck 
        LEFT JOIN tm_chuyen_kho_phu_tung ct ON ck.so_phieu = ct.ma_phieu 
        ${whereClause} 
        GROUP BY 
            ck.so_phieu, 
            ck.ngay_chuyen_kho, 
            ck.ma_kho_xuat, 
            ck.ma_kho_nhap, 
            ck.trang_thai, 
            ck.nguoi_tao, 
            ck.nguoi_duyet, 
            ck.ngay_duyet, 
            ck.dien_giai 
        ORDER BY ck.ngay_chuyen_kho DESC, ck.so_phieu DESC`;

    try {
      const result = await pool.query(sql, values);
      return result.rows;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách chuyển kho:", error);
      throw error;
    }
  }

  async getChiTiet(ma_phieu) {
    const client = await pool.connect();
    try {
      // 1. Lấy thông tin phiếu
      const phieuRes = await client.query(
        `SELECT * FROM tm_chuyen_kho WHERE so_phieu = $1`,
        [ma_phieu]
      );

      if (phieuRes.rowCount === 0) return null;

      // 2. Lấy chi tiết xe (Code cũ của bạn thiếu phần này)
      const xeRes = await client.query(
        `SELECT
            ct.stt, ct.xe_key, ct.trang_thai,
            x.so_khung, x.so_may, x.ma_mau, x.ma_loai_xe
         FROM tm_chuyen_kho_xe ct
         JOIN tm_xe_thuc_te x ON ct.xe_key = x.xe_key
         WHERE ct.ma_phieu = $1
         ORDER BY ct.stt`,
        [ma_phieu]
      );

      // 3. Lấy chi tiết phụ tùng
      const ptRes = await client.query(
        `SELECT * FROM tm_chuyen_kho_phu_tung WHERE ma_phieu = $1 ORDER BY stt`,
        [ma_phieu]
      );

      return {
        phieu: phieuRes.rows[0],
        chi_tiet_xe: xeRes.rows, // <--- Frontend cần field này
        chi_tiet_phu_tung: ptRes.rows, // <--- Frontend cần field này (đổi tên từ chi_tiet thành chi_tiet_phu_tung cho rõ)
      };
    } finally {
      client.release();
    }
  }
}

module.exports = new ChuyenKhoService();
