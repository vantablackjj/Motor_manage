const { pool } = require("../config/database");

class BaoCaoService {
  // ============================================================
  // BÁO CÁO TỒN KHO
  // ============================================================

  async tonKhoXe(filters = {}) {
    const { ma_kho, ma_loai_xe, ma_mau } = filters;
    let sql = `
      SELECT 
        x.ma_serial as xe_key, x.serial_identifier as so_khung, 
        (x.thuoc_tinh_rieng->>'so_may') as so_may, pt.gia_von_mac_dinh as gia_nhap, x.ngay_nhap_kho as ngay_nhap,
        pt.ten_hang_hoa as ten_loai, (x.thuoc_tinh_rieng->>'ten_mau') as ten_mau, k.ten_kho
      FROM tm_hang_hoa_serial x
      LEFT JOIN tm_hang_hoa pt ON x.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.trang_thai = 'TON_KHO' AND pt.status = true
      AND (pt.ma_nhom_hang IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) OR pt.ma_nhom_hang = 'XE')
    `;
    const params = [];
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      sql += ` AND TRIM(x.ma_kho_hien_tai) = ANY($${params.length}::text[])`;
    }
    if (ma_loai_xe) {
      params.push(ma_loai_xe);
      sql += ` AND x.ma_hang_hoa = $${params.length}`;
    }
    if (ma_mau) {
      params.push(ma_mau);
      sql += ` AND (x.thuoc_tinh_rieng->>'ma_mau' = $${params.length} OR x.thuoc_tinh_rieng->>'ten_mau' = $${params.length})`;
    }
    sql += ` ORDER BY x.ngay_nhap_kho DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async tonKhoPhuTung(filters = {}) {
    const { ma_kho, nhom_pt, canh_bao, page = 1, limit = 50 } = filters;
    const safeLimit = Math.min(Number(limit) || 50, 200);
    const offset = (Number(page) - 1) * safeLimit;

    let sql = `
      SELECT 
        tk.ma_hang_hoa as ma_pt, pt.ten_hang_hoa as ten_pt, pt.don_vi_tinh, pt.ma_nhom_hang as nhom_pt,
        tk.so_luong_ton, tk.so_luong_khoa, tk.so_luong_toi_thieu,
        k.ten_kho
      FROM tm_hang_hoa_ton_kho tk
      JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa
      JOIN sys_kho k ON tk.ma_kho = k.ma_kho
      WHERE (pt.ma_nhom_hang NOT IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) OR pt.ma_nhom_hang IS NULL)
    `;
    const params = [];
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      sql += ` AND TRIM(tk.ma_kho) = ANY($${params.length}::text[])`;
    }
    if (nhom_pt) {
      params.push(nhom_pt);
      sql += ` AND pt.ma_nhom_hang = $${params.length}`;
    }
    if (canh_bao === "true" || canh_bao === true) {
      sql += ` AND tk.so_luong_ton <= tk.so_luong_toi_thieu`;
    }

    sql += ` ORDER BY pt.ma_nhom_hang, pt.ten_hang_hoa, tk.ma_hang_hoa`;

    if (filters.page || filters.limit) {
      const safeLimit = Math.min(Number(limit) || 50, 500);
      const offset = (Number(page) - 1) * safeLimit;
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(safeLimit, offset);
    }

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async tonKhoTongHop(filters = {}) {
    const { ma_kho } = filters;
    let sqlXe = `
      SELECT k.ten_kho, COUNT(*) as so_luong, SUM(pt.gia_von_mac_dinh) as gia_tri
      FROM tm_hang_hoa_serial x
      JOIN tm_hang_hoa pt ON x.ma_hang_hoa = pt.ma_hang_hoa
      JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.trang_thai = 'TON_KHO'
      AND (pt.ma_nhom_hang IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) OR pt.ma_nhom_hang = 'XE')
    `;
    let sqlPT = `
      SELECT k.ten_kho, SUM(tk.so_luong_ton) as so_luong, SUM(tk.so_luong_ton * pt.gia_von_mac_dinh) as gia_tri
      FROM tm_hang_hoa_ton_kho tk
      JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa
      JOIN sys_kho k ON tk.ma_kho = k.ma_kho
      WHERE (pt.ma_nhom_hang NOT IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) OR pt.ma_nhom_hang IS NULL)
    `;

    const params = [];
    if (ma_kho) {
      const ma_kho_arr = Array.isArray(ma_kho) ? ma_kho : [ma_kho];
      params.push(ma_kho_arr);
      sqlXe += ` AND TRIM(x.ma_kho_hien_tai) = ANY($${params.length}::text[])`;
      sqlPT += ` AND TRIM(tk.ma_kho) = ANY($${params.length}::text[])`;
    }

    sqlXe += ` GROUP BY k.ten_kho`;
    sqlPT += ` GROUP BY k.ten_kho`;

    const [xeRes, ptRes] = await Promise.all([
      pool.query(sqlXe, params),
      pool.query(sqlPT, params),
    ]);

    // Calculate aggregated summary for convenience
    const summary = {
      xe: {
        so_luong: xeRes.rows.reduce((a, b) => a + Number(b.so_luong || 0), 0),
        gia_tri: xeRes.rows.reduce((a, b) => a + Number(b.gia_tri || 0), 0),
      },
      phu_tung: {
        so_luong: ptRes.rows.reduce((a, b) => a + Number(b.so_luong || 0), 0),
        gia_tri: ptRes.rows.reduce((a, b) => a + Number(b.gia_tri || 0), 0),
      }
    };

    return {
      xe: xeRes.rows,
      phu_tung: ptRes.rows,
      summary
    };
  }

  // ============================================================
  // BÁO CÁO DOANH THU
  // ============================================================

  async doanhThuTheoThang(filters = {}) {
    await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
    const { nam, ma_kho, tu_ngay, den_ngay, loai } = filters;
    const params = [];
    let paramIndex = 1;

    // Build conditions
    let condHD = "";
    let condBT = "";
    let condPTC = "";

    if (nam) {
      condHD += ` AND EXTRACT(YEAR FROM h.ngay_hoa_don) = $${paramIndex}`;
      condBT += ` AND EXTRACT(YEAR FROM COALESCE(b.ngay_bao_tri, b.created_at)) = $${paramIndex}`;
      condPTC += ` AND EXTRACT(YEAR FROM tc.ngay_giao_dich) = $${paramIndex}`;
      params.push(nam);
      paramIndex++;
    }
    if (tu_ngay) {
      condHD += ` AND h.ngay_hoa_don >= $${paramIndex}`;
      condBT += ` AND COALESCE(b.ngay_bao_tri, b.created_at) >= $${paramIndex}`;
      condPTC += ` AND tc.ngay_giao_dich >= $${paramIndex}`;
      params.push(tu_ngay);
      paramIndex++;
    }
    if (den_ngay) {
      condHD += ` AND h.ngay_hoa_don < ($${paramIndex}::date + 1)`;
      condBT += ` AND COALESCE(b.ngay_bao_tri, b.created_at) < ($${paramIndex}::date + 1)`;
      condPTC += ` AND tc.ngay_giao_dich < ($${paramIndex}::date + 1)`;
      params.push(den_ngay);
      paramIndex++;
    }
    if (ma_kho) {
      const ma_kho_arr = Array.isArray(ma_kho) ? ma_kho : [ma_kho];
      condHD += ` AND h.ma_ben_xuat = ANY($${paramIndex}::text[])`;
      condBT += ` AND b.ma_kho = ANY($${paramIndex}::text[])`;
      condPTC += ` AND tc.ma_kho = ANY($${paramIndex}::text[])`;
      params.push(ma_kho_arr);
      paramIndex++;
    }

    let sqlDoanhThu = "";
    if (loai === "XE") {
      sqlDoanhThu = `
        SELECT EXTRACT(MONTH FROM h.ngay_hoa_don) as thang, COUNT(DISTINCT h.id) as so_luong_hd, SUM(ct.thanh_tien) as doanh_thu
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        JOIN tm_hang_hoa_serial x ON ct.ma_serial = x.ma_serial
        JOIN tm_hang_hoa pt ON x.ma_hang_hoa = pt.ma_hang_hoa
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') AND h.loai_hoa_don = 'BAN_HANG'
        AND (pt.ma_nhom_hang IN (WITH RECURSIVE cat AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN cat ON n.ma_nhom_cha = cat.ma_nhom) SELECT ma_nhom FROM cat) OR pt.ma_nhom_hang = 'XE')
        ${condHD}
        GROUP BY thang
      `;
    } else if (loai === "PHU_TUNG") {
      sqlDoanhThu = `
        SELECT EXTRACT(MONTH FROM h.ngay_hoa_don) as thang, COUNT(DISTINCT h.id) as so_luong_hd, SUM(ct.thanh_tien) as doanh_thu
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') AND h.loai_hoa_don = 'BAN_HANG'
        AND (pt.ma_nhom_hang NOT IN (WITH RECURSIVE cat AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN cat ON n.ma_nhom_cha = cat.ma_nhom) SELECT ma_nhom FROM cat) OR pt.ma_nhom_hang IS NULL)
        ${condHD}
        GROUP BY thang
      `;
    } else if (loai === "DICH_VU") {
      sqlDoanhThu = `
        SELECT EXTRACT(MONTH FROM COALESCE(b.ngay_bao_tri, b.created_at)) as thang, COUNT(b.ma_phieu) as so_luong_hd, SUM(b.tong_tien) as doanh_thu
        FROM tm_bao_tri b
        WHERE b.trang_thai = 'HOAN_THANH'
        ${condBT}
        GROUP BY thang
      `;
    } else {
      sqlDoanhThu = `
        SELECT thang, SUM(so_luong_hd) as so_luong_hd, SUM(doanh_thu) as doanh_thu
        FROM (
          SELECT EXTRACT(MONTH FROM h.ngay_hoa_don) as thang, COUNT(h.id) as so_luong_hd, SUM(h.thanh_tien) as doanh_thu
          FROM tm_hoa_don h
          WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') AND h.loai_hoa_don = 'BAN_HANG'
          -- Lọc theo loại nếu có yêu cầu (mặc dù UNION ALL này tính tổng chung)
          ${loai === "XE" ? "AND (EXISTS (SELECT 1 FROM tm_hoa_don_chi_tiet ct JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa WHERE ct.so_hoa_don = h.so_hoa_don AND (pt.ma_nhom_hang IN (WITH RECURSIVE cat AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN cat ON n.ma_nhom_cha = cat.ma_nhom) SELECT ma_nhom FROM cat) OR pt.ma_nhom_hang = 'XE')))" : ""}
          ${loai === "PHU_TUNG" ? "AND (EXISTS (SELECT 1 FROM tm_hoa_don_chi_tiet ct JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa WHERE ct.so_hoa_don = h.so_hoa_don AND (pt.ma_nhom_hang NOT IN (WITH RECURSIVE cat AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN cat ON n.ma_nhom_cha = cat.ma_nhom) SELECT ma_nhom FROM cat) OR pt.ma_nhom_hang IS NULL)))" : ""}
          ${condHD}
          GROUP BY thang
          UNION ALL
          SELECT EXTRACT(MONTH FROM COALESCE(b.ngay_bao_tri, b.created_at)) as thang, COUNT(b.ma_phieu) as so_luong_hd, SUM(b.tong_tien) as doanh_thu
          FROM tm_bao_tri b
          WHERE b.trang_thai = 'HOAN_THANH'
          ${condBT}
          GROUP BY thang
        ) t GROUP BY thang
      `;
    }

    // 3. Thực thu (Tiền mặt/Chuyển khoản thực tế thu về)
    // Chỉ tính phiếu THU đã DUYỆT (Dòng tiền thực)
    let sqlThucThu = `
      SELECT EXTRACT(MONTH FROM tc.ngay_giao_dich) as thang, SUM(tc.so_tien) as thuc_thu
      FROM tm_phieu_thu_chi tc
      WHERE tc.loai_phieu = 'THU' AND tc.trang_thai = 'DA_DUYET'
      ${condPTC}
      GROUP BY thang
    `;

    const [resDoanhThu, resThucThu] = await Promise.all([
      pool.query(sqlDoanhThu, params),
      pool.query(sqlThucThu, params),
    ]);

    const result = [];
    for (let m = 1; m <= 12; m++) {
      const dRec = resDoanhThu.rows.find((r) => Number(r.thang) === m);
      const tRec = resThucThu.rows.find((r) => Number(r.thang) === m);
      result.push({
        thang: m,
        so_luong_hd: dRec ? Number(dRec.so_luong_hd) : 0,
        doanh_thu: dRec ? Number(dRec.doanh_thu) : 0,
        thuc_thu: tRec ? Number(tRec.thuc_thu) : 0,
      });
    }

    return result.filter(
      (r) => r.doanh_thu > 0 || r.thuc_thu > 0 || r.so_luong_hd > 0,
    );
  }

  async doanhThuTheoKho(filters = {}) {
    await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
    const { tu_ngay, den_ngay, ma_kho } = filters;
    const params = [];
    let paramIndex = 1;

    let condHD = "";
    let condBT = "";
    let condPTC = "";

    if (tu_ngay) {
      condHD += ` AND h.ngay_hoa_don >= $${paramIndex}`;
      condBT += ` AND COALESCE(b.ngay_bao_tri, b.created_at) >= $${paramIndex}`;
      condPTC += ` AND tc.ngay_giao_dich >= $${paramIndex}`;
      params.push(tu_ngay);
      paramIndex++;
    }
    if (den_ngay) {
      condHD += ` AND h.ngay_hoa_don < ($${paramIndex}::date + 1)`;
      condBT += ` AND COALESCE(b.ngay_bao_tri, b.created_at) < ($${paramIndex}::date + 1)`;
      condPTC += ` AND tc.ngay_giao_dich < ($${paramIndex}::date + 1)`;
      params.push(den_ngay);
      paramIndex++;
    }
    if (ma_kho) {
      const ma_kho_arr = Array.isArray(ma_kho) ? ma_kho : [ma_kho];
      condHD += ` AND h.ma_ben_xuat = ANY($${paramIndex}::text[])`;
      condBT += ` AND b.ma_kho = ANY($${paramIndex}::text[])`;
      condPTC += ` AND tc.ma_kho = ANY($${paramIndex}::text[])`;
      params.push(ma_kho_arr);
      paramIndex++;
    }

    const sqlDoanhThu = `
      SELECT t.ma_kho, k.ten_kho, SUM(t.so_luong_hd) as so_luong_hd, SUM(t.doanh_thu) as doanh_thu
      FROM (
        SELECT h.ma_ben_xuat as ma_kho, COUNT(h.so_hoa_don) as so_luong_hd, SUM(h.thanh_tien) as doanh_thu
        FROM tm_hoa_don h
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') AND h.loai_hoa_don = 'BAN_HANG'
        ${condHD}
        GROUP BY h.ma_ben_xuat
        UNION ALL
        SELECT b.ma_kho, COUNT(b.ma_phieu) as so_luong_hd, SUM(b.tong_tien) as doanh_thu
        FROM tm_bao_tri b
        WHERE b.trang_thai = 'HOAN_THANH'
        ${condBT}
        GROUP BY b.ma_kho
      ) t
      LEFT JOIN sys_kho k ON t.ma_kho = k.ma_kho
      GROUP BY t.ma_kho, k.ten_kho
    `;

    const sqlThucThu = `
      SELECT tc.ma_kho, SUM(tc.so_tien) as thuc_thu
      FROM tm_phieu_thu_chi tc
      WHERE tc.loai_phieu = 'THU' AND tc.trang_thai = 'DA_DUYET'
      ${condPTC}
      GROUP BY tc.ma_kho
    `;

    const [resDoanhThu, resThucThu] = await Promise.all([
      pool.query(sqlDoanhThu, params),
      pool.query(sqlThucThu, params),
    ]);

    const result = resDoanhThu.rows.map((dRec) => {
      const tRec = resThucThu.rows.find((r) => r.ma_kho === dRec.ma_kho);
      return {
        ten_kho: dRec.ten_kho || "Không xác định",
        so_luong_hd: Number(dRec.so_luong_hd),
        doanh_thu: Number(dRec.doanh_thu),
        thuc_thu: tRec ? Number(tRec.thuc_thu) : 0,
      };
    });

    // Add any kho that have thuc_thu but 0 doanh_thu
    resThucThu.rows.forEach((tRec) => {
      if (!resDoanhThu.rows.find((r) => r.ma_kho === tRec.ma_kho)) {
        result.push({
          ten_kho: tRec.ten_kho || "Không xác định",
          so_luong_hd: 0,
          doanh_thu: 0,
          thuc_thu: Number(tRec.thuc_thu),
        });
      }
    });

    const summary = {
      total_revenue: result.reduce((a, b) => a + b.doanh_thu, 0),
      total_actual: result.reduce((a, b) => a + b.thuc_thu, 0),
      total_orders: result.reduce((a, b) => a + b.so_luong_hd, 0)
    };

    return {
      data: result,
      summary
    };
  }

  async doanhThuTheoSanPham(filters = {}) {
    await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
    const { tu_ngay, den_ngay, ma_kho, loai } = filters;
    let sql = "";
    const params = [];

    if (loai === "XE") {
      sql = `
        SELECT pt.ten_hang_hoa as san_pham, COUNT(*) as so_luong, SUM(ct.thanh_tien) as doanh_thu
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        JOIN tm_hang_hoa_serial x ON ct.ma_serial = x.ma_serial
        JOIN tm_hang_hoa pt ON x.ma_hang_hoa = pt.ma_hang_hoa
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') 
        AND h.loai_hoa_don = 'BAN_HANG'
        AND (pt.ma_nhom_hang IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) OR pt.ma_nhom_hang = 'XE')
      `;
    } else {
      sql = `
        SELECT pt.ten_hang_hoa as san_pham, SUM(ct.so_luong) as so_luong, SUM(ct.thanh_tien) as doanh_thu
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') 
        AND h.loai_hoa_don = 'BAN_HANG'
        AND (pt.ma_nhom_hang NOT IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) OR pt.ma_nhom_hang IS NULL)
      `;
    }

    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_hoa_don >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_hoa_don < ($${params.length}::date + 1)`;
    }
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      sql += ` AND h.ma_ben_xuat = ANY($${params.length}::text[])`;
    }

    sql += ` GROUP BY san_pham ORDER BY doanh_thu DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async doanhThuTongHop(filters = {}) {
    await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
    const { tu_ngay, den_ngay, ma_kho } = filters;
    const params = [];
    let paramIndex = 1;

    let condHD = "";
    let condBT = "";
    let condPTC = "";

    if (tu_ngay) {
      condHD += ` AND ngay_hoa_don >= $${paramIndex}`;
      condBT += ` AND COALESCE(ngay_bao_tri, created_at) >= $${paramIndex}`;
      condPTC += ` AND ngay_giao_dich >= $${paramIndex}`;
      params.push(tu_ngay);
      paramIndex++;
    }
    if (den_ngay) {
      condHD += ` AND ngay_hoa_don < ($${paramIndex}::date + 1)`;
      condBT += ` AND COALESCE(ngay_bao_tri, created_at) < ($${paramIndex}::date + 1)`;
      condPTC += ` AND ngay_giao_dich < ($${paramIndex}::date + 1)`;
      params.push(den_ngay);
      paramIndex++;
    }

    if (ma_kho) {
      const ma_kho_arr = Array.isArray(ma_kho) ? ma_kho : [ma_kho];
      condHD += ` AND ma_ben_xuat = ANY($${paramIndex}::text[])`;
      condBT += ` AND ma_kho = ANY($${paramIndex}::text[])`;
      condPTC += ` AND ma_kho = ANY($${paramIndex}::text[])`;
      params.push(ma_kho_arr);
      paramIndex++;
    }

    const sqlDoanhThu = `
      SELECT COALESCE(SUM(dt), 0) as tong_doanh_thu, COALESCE(SUM(sl), 0) as tong_hoa_don
      FROM (
        SELECT SUM(thanh_tien) as dt, COUNT(so_hoa_don) as sl FROM tm_hoa_don 
        WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') AND loai_hoa_don = 'BAN_HANG'
        ${condHD}
        UNION ALL
        SELECT SUM(tong_tien) as dt, COUNT(ma_phieu) as sl FROM tm_bao_tri
        WHERE trang_thai = 'HOAN_THANH'
        ${condBT}
      ) t
    `;

    const sqlThucThu = `
      SELECT COALESCE(SUM(so_tien), 0) as tong_thuc_thu
      FROM tm_phieu_thu_chi
      WHERE loai_phieu = 'THU' AND trang_thai != 'DA_HUY'
      ${condPTC}
    `;

    const [resDoanhThu, resThucThu] = await Promise.all([
      pool.query(sqlDoanhThu, params),
      pool.query(sqlThucThu, params),
    ]);

    return {
      tong_doanh_thu: Number(resDoanhThu.rows[0]?.tong_doanh_thu || 0),
      tong_thuc_thu: Number(resThucThu.rows[0]?.tong_thuc_thu || 0),
      tong_hoa_don: Number(resDoanhThu.rows[0]?.tong_hoa_don || 0),
    };
  }

  async doanhThuChiTiet(filters = {}) {
    await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
    const { tu_ngay, den_ngay, ma_kho, loai } = filters;
    const params = [];
    let paramIndex = 1;

    let condHD = "";
    let condBT = "";

    if (tu_ngay) {
      condHD += ` AND h.ngay_hoa_don >= $${paramIndex}`;
      condBT += ` AND COALESCE(b.thoi_gian_ket_thuc, b.updated_at) >= $${paramIndex}`;
      params.push(tu_ngay);
      paramIndex++;
    }
    if (den_ngay) {
      condHD += ` AND h.ngay_hoa_don < ($${paramIndex}::date + 1)`;
      condBT += ` AND COALESCE(b.thoi_gian_ket_thuc, b.updated_at) < ($${paramIndex}::date + 1)`;
      params.push(den_ngay);
      paramIndex++;
    }
    if (ma_kho) {
      const ma_kho_arr = Array.isArray(ma_kho) ? ma_kho : [ma_kho];
      condHD += ` AND h.ma_ben_xuat = ANY($${paramIndex}::text[])`;
      condBT += ` AND b.ma_kho = ANY($${paramIndex}::text[])`;
      params.push(ma_kho_arr);
      paramIndex++;
    }

    const sql = `
      SELECT * FROM (
        -- Dữ liệu từ hóa đơn bán lẻ (Xe & Phụ tùng)
        SELECT 
          h.ngay_hoa_don as ngay, 
          h.so_hoa_don as so_phieu,
          CASE 
            WHEN pt.ma_nhom_hang IN (WITH RECURSIVE cat AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN cat ON n.ma_nhom_cha = cat.ma_nhom) SELECT ma_nhom FROM cat) OR pt.ma_nhom_hang = 'XE' THEN 'XE'
            ELSE 'PHU_TUNG'
          END as loai_doanh_thu,
          dt.ten_doi_tac as khach_hang,
          pt.ten_hang_hoa as noi_dung,
          ct.so_luong,
          ct.don_gia,
          ct.thanh_tien,
          k.ten_kho as kho
        FROM tm_hoa_don h
        JOIN tm_hoa_don_chi_tiet ct ON h.so_hoa_don = ct.so_hoa_don
        JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
        LEFT JOIN dm_doi_tac dt ON h.ma_ben_nhap = dt.ma_doi_tac
        LEFT JOIN sys_kho k ON h.ma_ben_xuat = k.ma_kho
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') 
        AND h.loai_hoa_don = 'BAN_HANG'
        ${condHD}

        UNION ALL

        -- Dữ liệu từ phiếu bảo trì/sửa chữa
        SELECT 
          COALESCE(b.thoi_gian_ket_thuc, b.updated_at) as ngay,
          b.ma_phieu as so_phieu,
          CASE WHEN bt_ct.loai_hang_muc = 'PHU_TUNG' THEN 'PHU_TUNG' ELSE 'DICH_VU' END as loai_doanh_thu,
          dt.ten_doi_tac as khach_hang,
          bt_ct.ten_hang_muc as noi_dung,
          bt_ct.so_luong,
          bt_ct.don_gia,
          bt_ct.thanh_tien,
          k.ten_kho as kho
        FROM tm_bao_tri b
        JOIN tm_bao_tri_chi_tiet bt_ct ON b.ma_phieu = bt_ct.ma_phieu
        LEFT JOIN dm_doi_tac dt ON b.ma_doi_tac = dt.ma_doi_tac
        LEFT JOIN sys_kho k ON b.ma_kho = k.ma_kho
        WHERE b.trang_thai = 'HOAN_THANH'
        ${condBT}
      ) combined
      WHERE ($${paramIndex}::text IS NULL OR loai_doanh_thu = $${paramIndex})
      ORDER BY ngay DESC, so_phieu DESC
    `;

    params.push(loai || null);

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  // ============================================================
  // BÁO CÁO LỢI NHUẬN (PROFIT & LOSS)
  // ============================================================

  async baoCaoLoiNhuan(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho, loai } = filters;
    const params = [];
    let paramIndex = 1;

    let cond =
      "WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') AND h.loai_hoa_don = 'BAN_HANG'";
    if (tu_ngay) {
      params.push(tu_ngay);
      cond += ` AND h.ngay_hoa_don >= $${paramIndex}`;
      paramIndex++;
    }
    if (den_ngay) {
      params.push(den_ngay);
      cond += ` AND h.ngay_hoa_don < ($${paramIndex}::date + 1)`;
      paramIndex++;
    }
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      cond += ` AND h.ma_ben_xuat = ANY($${paramIndex}::text[])`;
      paramIndex++;
    }

    let sql = "";
    if (loai === "XE") {
      sql = `
        SELECT 
          ct.ma_serial as xe_key,
          pt.ten_hang_hoa as ten_xe,
          x.serial_identifier as so_khung,
          h.so_hoa_don,
          h.ngay_hoa_don as ngay_ban,
          ct.don_gia as gia_ban,
          COALESCE(x.gia_von, pt.gia_von_mac_dinh, 0) as gia_von,
          (ct.thanh_tien - COALESCE(x.gia_von, pt.gia_von_mac_dinh, 0)) as loi_nhuan,
          CASE WHEN COALESCE(x.gia_von, pt.gia_von_mac_dinh, 0) > 0 
               THEN (ct.thanh_tien - COALESCE(x.gia_von, pt.gia_von_mac_dinh, 0)) / COALESCE(x.gia_von, pt.gia_von_mac_dinh, 0) * 100 
               ELSE 100 END as ti_le_ln
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        JOIN tm_hang_hoa_serial x ON ct.ma_serial = x.ma_serial
        JOIN tm_hang_hoa pt ON x.ma_hang_hoa = pt.ma_hang_hoa
        ${cond}
        ORDER BY h.ngay_hoa_don DESC
      `;
    } else if (loai === "PHU_TUNG") {
      sql = `
        SELECT 
          pt.ma_hang_hoa as ma_pt,
          pt.ten_hang_hoa as ten_pt,
          SUM(ct.so_luong) as so_luong,
          SUM(ct.thanh_tien) as doanh_thu,
          SUM(ct.so_luong * COALESCE(pt.gia_von_mac_dinh, 0)) as tong_gia_von,
          SUM(ct.thanh_tien - (ct.so_luong * COALESCE(pt.gia_von_mac_dinh, 0))) as loi_nhuan
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
        ${cond}
        AND ct.ma_serial IS NULL
        GROUP BY pt.ma_hang_hoa, pt.ten_hang_hoa
        ORDER BY loi_nhuan DESC
      `;
    } else {
      // Tổng hợp chung
      sql = `
        SELECT 
          SUM(ct.thanh_tien) as tong_doanh_thu,
          SUM(CASE 
            WHEN ct.ma_serial IS NOT NULL THEN COALESCE(x.gia_von, pt.gia_von_mac_dinh, 0)
            ELSE ct.so_luong * COALESCE(pt.gia_von_mac_dinh, 0)
          END) as tong_gia_von,
          SUM(ct.thanh_tien - CASE 
            WHEN ct.ma_serial IS NOT NULL THEN COALESCE(x.gia_von, pt.gia_von_mac_dinh, 0)
            ELSE ct.so_luong * COALESCE(pt.gia_von_mac_dinh, 0)
          END) as tong_loi_nhuan
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        LEFT JOIN tm_hang_hoa_serial x ON ct.ma_serial = x.ma_serial
        LEFT JOIN tm_hang_hoa pt ON COALESCE(x.ma_hang_hoa, ct.ma_hang_hoa) = pt.ma_hang_hoa
        ${cond}
      `;
    }

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  // ============================================================
  // BÁO CÁO NHẬP XUẤT
  // ============================================================

  async nhapXuatXe(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho, loai_giao_dich } = filters;
    let sql = `
      SELECT 
        ls.*, 
        -- Identification of Source (Kho xuat / NCC)
        COALESCE(
          k_xuat.ten_kho, 
          ncc_po.ten_doi_tac, 
          ncc_hd.ten_doi_tac,
          CASE WHEN ls.loai_giao_dich IN ('NHAP', 'NHAP_KHO', 'MUA') THEN 'Nhà cung cấp' ELSE NULL END
        )::varchar as kho_xuat,
        
        -- Identification of Destination (Kho nhap / Khach hang)
        COALESCE(
          k_nhap.ten_kho, 
          kh_hd.ten_doi_tac,
          CASE WHEN ls.loai_giao_dich IN ('XUAT', 'XUAT_KHO', 'BAN', 'BAN_HANG') THEN 'Khách hàng' ELSE NULL END
        )::varchar as kho_nhap,
        
        pt.ten_hang_hoa::varchar as ten_loai, 
        COALESCE(x.thuoc_tinh_rieng->>'ten_mau', x.thuoc_tinh_rieng->>'ma_mau')::varchar as ten_mau,
        x.serial_identifier::varchar as so_khung
      FROM tm_hang_hoa_lich_su ls
      -- Junction 1: Basic joins
      LEFT JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN tm_hang_hoa_serial x ON ls.ma_serial = x.ma_serial
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      
      -- Junction 2: Link to Purchase Order (Source of many imports)
      LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang 
      LEFT JOIN dm_doi_tac ncc_po ON po.ma_ben_xuat = ncc_po.ma_doi_tac AND po.loai_ben_xuat::varchar = 'DOI_TAC'
      
      -- Junction 3: Link to Invoice (Source of sales or alternate purchase tracking)
      LEFT JOIN tm_hoa_don hd ON ls.so_chung_tu = hd.so_hoa_don 
      LEFT JOIN dm_doi_tac ncc_hd ON hd.ma_ben_xuat = ncc_hd.ma_doi_tac AND hd.loai_ben_xuat::varchar = 'DOI_TAC'
      LEFT JOIN dm_doi_tac kh_hd ON hd.ma_ben_nhap = kh_hd.ma_doi_tac AND hd.loai_ben_nhap::varchar = 'DOI_TAC'

      WHERE (
        pt.ma_nhom_hang IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) 
        OR pt.ma_nhom_hang = 'XE'
        OR pt.loai_quan_ly::varchar = 'SERIAL' -- More inclusive fallback
      )
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ls.ngay_giao_dich >= $${params.length}::date`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ls.ngay_giao_dich < ($${params.length}::date + 1)`;
    }
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND (ls.ma_kho_xuat = $${params.length} OR ls.ma_kho_nhap = $${params.length})`;
    }
    if (loai_giao_dich) {
      params.push(loai_giao_dich);
      sql += ` AND ls.loai_giao_dich = $${params.length}`;
    }
    sql += ` ORDER BY ls.ngay_giao_dich DESC, ls.id DESC`;

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async nhapXuatPhuTung(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho, ma_pt } = filters;
    let sql = `
      SELECT 
        ls.*, 
        -- Identification of Source
        COALESCE(
          k_xuat.ten_kho, 
          ncc_po.ten_doi_tac, 
          ncc_hd.ten_doi_tac,
          CASE WHEN ls.loai_giao_dich IN ('NHAP', 'NHAP_KHO', 'MUA') THEN 'Nhà cung cấp' ELSE NULL END
        )::varchar as kho_xuat, 
        
        -- Identification of Destination
        COALESCE(
          k_nhap.ten_kho, 
          kh_hd.ten_doi_tac,
          CASE WHEN ls.loai_giao_dich IN ('XUAT', 'XUAT_KHO', 'BAN', 'BAN_HANG') THEN 'Khách hàng' ELSE NULL END
        )::varchar as kho_nhap,
        
        pt.ten_hang_hoa::varchar as ten_pt, pt.don_vi_tinh::varchar
      FROM tm_hang_hoa_lich_su ls
      -- Basic joins
      LEFT JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      
      -- Link to PO (so_chung_tu might be POP...)
      LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang 
      LEFT JOIN dm_doi_tac ncc_po ON po.ma_ben_xuat = ncc_po.ma_doi_tac AND po.loai_ben_xuat::varchar = 'DOI_TAC'
      
      -- Link to Invoice (so_chung_tu might be PNK... or HD...)
      LEFT JOIN tm_hoa_don hd ON ls.so_chung_tu = hd.so_hoa_don 
      LEFT JOIN dm_doi_tac ncc_hd ON hd.ma_ben_xuat = ncc_hd.ma_doi_tac AND hd.loai_ben_xuat::varchar = 'DOI_TAC'
      LEFT JOIN dm_doi_tac kh_hd ON hd.ma_ben_nhap = kh_hd.ma_doi_tac AND hd.loai_ben_nhap::varchar = 'DOI_TAC'

      WHERE (
        pt.ma_nhom_hang NOT IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) 
        OR pt.ma_nhom_hang IS NULL
      )
      AND pt.loai_quan_ly::varchar != 'SERIAL'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ls.ngay_giao_dich >= $${params.length}::date`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ls.ngay_giao_dich < ($${params.length}::date + 1)`;
    }
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND (ls.ma_kho_xuat = $${params.length} OR ls.ma_kho_nhap = $${params.length})`;
    }
    if (ma_pt) {
      params.push(ma_pt);
      sql += ` AND ls.ma_hang_hoa = $${params.length}`;
    }
    sql += ` ORDER BY ls.ngay_giao_dich DESC, ls.id DESC`;

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async theKhoPhuTung(filters = {}) {
    return this.nhapXuatPhuTung(filters);
  }

  // ============================================================
  // BÁO CÁO CHUYỂN KHO
  // ============================================================

  async chuyenKhoTongHop(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho_xuat, ma_kho_nhap } = filters;
    let sql = `
      SELECT 
        ck.so_don_hang as so_phieu, ck.ngay_dat_hang as ngay_chuyen_kho, ck.trang_thai,
        kx.ten_kho as kho_xuat, kn.ten_kho as kho_nhap,
        u.username as nguoi_tao, u_duyet.username as nguoi_duyet
      FROM tm_don_hang ck
      JOIN sys_kho kx ON ck.ma_ben_xuat = kx.ma_kho
      JOIN sys_kho kn ON ck.ma_ben_nhap = kn.ma_kho
      LEFT JOIN sys_user u ON ck.created_by = u.id
      LEFT JOIN sys_user u_duyet ON ck.updated_by = u_duyet.id
      WHERE ck.loai_don_hang = 'CHUYEN_KHO'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ck.ngay_dat_hang >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ck.ngay_dat_hang < ($${params.length}::date + 1)`;
    }
    if (ma_kho_xuat) {
      params.push(Array.isArray(ma_kho_xuat) ? ma_kho_xuat : [ma_kho_xuat]);
      sql += ` AND ck.ma_ben_xuat = ANY($${params.length}::text[])`;
    }
    if (ma_kho_nhap) {
      params.push(Array.isArray(ma_kho_nhap) ? ma_kho_nhap : [ma_kho_nhap]);
      sql += ` AND ck.ma_ben_nhap = ANY($${params.length}::text[])`;
    }
    sql += ` ORDER BY ck.ngay_dat_hang DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async chuyenKhoChiTiet(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho } = filters;
    let sql = `
      SELECT 
        ck.so_don_hang as so_phieu, ck.ngay_dat_hang as ngay_chuyen_kho,
        kx.ten_kho as kho_xuat, kn.ten_kho as kho_nhap,
        hh.ten_hang_hoa as hang_hoa,
        COALESCE(x.serial_identifier, '') as so_khung,
        ck_ct.so_luong_dat as so_luong
      FROM tm_don_hang ck
      JOIN sys_kho kx ON ck.ma_ben_xuat = kx.ma_kho
      JOIN sys_kho kn ON ck.ma_ben_nhap = kn.ma_kho
      JOIN tm_don_hang_chi_tiet ck_ct ON ck.so_don_hang = ck_ct.so_don_hang
      JOIN tm_hang_hoa hh ON ck_ct.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN tm_hang_hoa_serial x ON (ck_ct.yeu_cau_dac_biet->>'ma_serial') = x.ma_serial
      WHERE ck.loai_don_hang = 'CHUYEN_KHO'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ck.ngay_dat_hang >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ck.ngay_dat_hang < ($${params.length}::date + 1)`;
    }
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      sql += ` AND (ck.ma_ben_xuat = ANY($${params.length}::text[]) OR ck.ma_ben_nhap = ANY($${params.length}::text[]))`;
    }
    sql += ` ORDER BY ck.ngay_dat_hang DESC, ck.so_don_hang`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  // ============================================================
  // BÁO CÁO CÔNG NỢ
  // ============================================================

  async congNoNoiBo(filters = {}) {
    const { ma_kho, tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT 
        cn.*,
        kx.ten_kho as kho_no,
        kn.ten_kho as kho_co
      FROM tm_cong_no_noi_bo cn
      JOIN sys_kho kx ON cn.ma_kho_no = kx.ma_kho
      JOIN sys_kho kn ON cn.ma_kho_co = kn.ma_kho
      WHERE cn.con_lai > 0
    `;
    const params = [];
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      sql += ` AND (cn.ma_kho_no = ANY($${params.length}::text[]) OR cn.ma_kho_co = ANY($${params.length}::text[]))`;
    }
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND cn.updated_at >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND cn.updated_at < ($${params.length}::date + 1)`;
    }
    sql += ` ORDER BY cn.updated_at DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async congNoKhachHang(filters = {}) {
    const { ma_kh, ma_ncc, tu_ngay, den_ngay, loai_cong_no, search, ma_kho } = filters;

    // If specific type is requested, return only that type
    if (loai_cong_no === "PHAI_TRA") {
      return this.congNoNhaCungCap(filters);
    } else if (loai_cong_no === "PHAI_THU") {
      // Return only customer debts
      let sql = `
        SELECT 
          dt.ten_doi_tac::varchar as ho_ten, 
          cn.ma_doi_tac::varchar as ma_kh,
          cn.loai_cong_no::varchar,
          cn.ma_kho::varchar as ma_kho,
          cn.tong_no::numeric as tong_no,
          cn.tong_da_thanh_toan::numeric as da_tra,
          cn.con_lai::numeric,
          cn.updated_at as ngay_cap_nhat
        FROM tm_cong_no_doi_tac cn
        JOIN dm_doi_tac dt ON cn.ma_doi_tac = dt.ma_doi_tac
        WHERE cn.loai_cong_no = 'PHAI_THU' AND cn.con_lai > 0
      `;
      const params = [];
      if (ma_kh) {
        params.push(ma_kh);
        sql += ` AND cn.ma_doi_tac = $${params.length}`;
      }
      if (ma_kho) {
        const ma_kho_arr = Array.isArray(ma_kho) ? ma_kho : [ma_kho];
        params.push(ma_kho_arr);
        sql += ` AND cn.ma_kho = ANY($${params.length}::text[])`;
      }
      if (search) {
        params.push(`%${search}%`);
        sql += ` AND (dt.ten_doi_tac ILIKE $${params.length} OR cn.ma_doi_tac ILIKE $${params.length})`;
      }
      sql += ` ORDER BY cn.con_lai DESC`;
      const { rows } = await pool.query(sql, params);
      return rows;
    }

    // Return both customer and supplier debts
    let sqlKhachHang = `
      SELECT 
        dt.ten_doi_tac::varchar as ho_ten, 
        cn.ma_doi_tac::varchar,
        'KHACH_HANG'::varchar as loai_doi_tac,
        cn.loai_cong_no::varchar,
        cn.tong_no::numeric as tong_no,
        cn.tong_da_thanh_toan::numeric as da_tra,
        cn.con_lai::numeric,
        cn.updated_at as ngay_cap_nhat
      FROM tm_cong_no_doi_tac cn
      JOIN dm_doi_tac dt ON cn.ma_doi_tac = dt.ma_doi_tac
      WHERE cn.loai_cong_no = 'PHAI_THU' AND cn.con_lai > 0
    `;

    let sqlNhaCungCap = `
      SELECT 
        dt.ten_doi_tac::varchar as ho_ten, 
        cn.ma_doi_tac::varchar,
        'NHA_CUNG_CAP'::varchar as loai_doi_tac,
        cn.loai_cong_no::varchar,
        cn.tong_no::numeric as tong_no,
        cn.tong_da_thanh_toan::numeric as da_tra,
        cn.con_lai::numeric,
        cn.updated_at as ngay_cap_nhat
      FROM tm_cong_no_doi_tac cn
      JOIN dm_doi_tac dt ON cn.ma_doi_tac = dt.ma_doi_tac
      WHERE cn.loai_cong_no = 'PHAI_TRA' AND cn.con_lai > 0
    `;

    const params = [];
    let paramIndex = 0;

    if (ma_kh) {
      paramIndex++;
      params.push(ma_kh);
      sqlKhachHang += ` AND cn.ma_doi_tac = $${paramIndex}`;
    }
    if (ma_ncc && !ma_kh) {
      // Only apply ma_ncc filter if ma_kh is not present to avoid conflicting filters on ma_doi_tac
      paramIndex++;
      params.push(ma_ncc);
      sqlNhaCungCap += ` AND cn.ma_doi_tac = $${paramIndex}`;
    }
    if (search) {
      paramIndex++;
      params.push(`%${search}%`);
      sqlKhachHang += ` AND (dt.ten_doi_tac ILIKE $${paramIndex} OR cn.ma_doi_tac ILIKE $${paramIndex})`;
      sqlNhaCungCap += ` AND (dt.ten_doi_tac ILIKE $${paramIndex} OR cn.ma_doi_tac ILIKE $${paramIndex})`;
    }

    // Combine both queries with UNION ALL
    const combinedSql = `
      SELECT * FROM (
        ${sqlKhachHang}
        UNION ALL
        ${sqlNhaCungCap}
      ) as combined
      ORDER BY loai_cong_no DESC, con_lai DESC
    `;

    const { rows } = await pool.query(combinedSql, params);

    // Calculate summary
    const summary = {
      tong_phai_thu: 0,
      tong_phai_tra: 0,
      so_khach_hang_no: 0,
      so_nha_cung_cap_no: 0,
    };

    rows.forEach((row) => {
      if (row.loai_cong_no === "PHAI_THU") {
        summary.tong_phai_thu += parseFloat(row.con_lai || 0);
        summary.so_khach_hang_no++;
      } else if (row.loai_cong_no === "PHAI_TRA") {
        summary.tong_phai_tra += parseFloat(row.con_lai || 0);
        summary.so_nha_cung_cap_no++;
      }
    });

    return {
      data: rows,
      summary,
    };
  }

  async congNoNhaCungCap(filters = {}) {
    const { ma_ncc, tu_ngay, den_ngay, ma_kho } = filters;
    let sql = `
      SELECT 
        dt.ten_doi_tac as ho_ten, 
        cn.ma_doi_tac as ma_ncc,
        cn.ma_kho,
        cn.tong_no as tong_no,
        cn.tong_da_thanh_toan as da_tra,
        cn.con_lai
      FROM tm_cong_no_doi_tac cn
      JOIN dm_doi_tac dt ON cn.ma_doi_tac = dt.ma_doi_tac
      WHERE cn.loai_cong_no = 'PHAI_TRA' AND cn.con_lai > 0
    `;
    const params = [];
    if (ma_ncc) {
      params.push(ma_ncc);
      sql += ` AND cn.ma_doi_tac = $${params.length}`;
    }
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      sql += ` AND cn.ma_kho = ANY($${params.length}::text[])`;
    }
    sql += ` ORDER BY cn.con_lai DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  // ============================================================
  // BÁO CÁO THU CHI
  // ============================================================

  async thuChiTheoNgay(filters = {}) {
    await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
    const { tu_ngay, den_ngay, ma_kho, loai } = filters;
    let sql = `
      SELECT 
        ngay_giao_dich, 
        loai_phieu as loai,
        so_tien, 
        COALESCE(noi_dung, '') as dien_giai,
        k.ten_kho, 
        so_phieu_tc as so_phieu
      FROM tm_phieu_thu_chi tc
      LEFT JOIN sys_kho k ON tc.ma_kho = k.ma_kho
      WHERE trang_thai = 'DA_DUYET'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ngay_giao_dich >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ngay_giao_dich < ($${params.length}::date + 1)`;
    }
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      sql += ` AND tc.ma_kho = ANY($${params.length}::text[])`;
    }
    // Chỉ filter loai_phieu nếu loai là THU hoặc CHI (không phải XE/PHU_TUNG/DICH_VU)
    if (loai && (loai === "THU" || loai === "CHI")) {
      params.push(loai);
      sql += ` AND loai_phieu = $${params.length}`;
    }
    sql += ` ORDER BY ngay_giao_dich DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async thuChiTongHop(filters = {}) {
    const { tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT 
        k.ten_kho,
        SUM(CASE WHEN loai_phieu = 'THU' THEN so_tien ELSE 0 END) as tong_thu,
        SUM(CASE WHEN loai_phieu = 'CHI' THEN so_tien ELSE 0 END) as tong_chi
      FROM tm_phieu_thu_chi tc
      LEFT JOIN sys_kho k ON tc.ma_kho = k.ma_kho
      WHERE tc.trang_thai = 'DA_DUYET'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ngay_giao_dich >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ngay_giao_dich < ($${params.length}::date + 1)`;
    }
    sql += ` GROUP BY k.ten_kho`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  // ============================================================
  // BÁO CÁO KHÁCH HÀNG
  // ============================================================

  async topKhachHang(filters = {}) {
    const { tu_ngay, den_ngay, limit = 10 } = filters;
    let sql = `
      FROM dm_doi_tac kh
      JOIN tm_hoa_don h ON kh.ma_doi_tac = h.ma_ben_nhap
      WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') 
      AND h.loai_hoa_don = 'BAN_HANG'
      AND kh.loai_doi_tac IN ('KHACH_HANG', 'CA_HAI')
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_hoa_don >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_hoa_don <= $${params.length}`;
    }
    sql += ` GROUP BY kh.ten_doi_tac ORDER BY tong_chi_tieu DESC OVERRIDE_LIMIT`;
    sql = sql.replace("OVERRIDE_LIMIT", `LIMIT $${params.length + 1}`);
    params.push(limit);
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async lichSuMuaHang(filters = {}) {
    const { ma_kh, tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT h.so_hoa_don as so_hd, h.ngay_hoa_don as ngay_ban, h.thanh_tien as thanh_toan, h.trang_thai, k.ten_kho
      FROM tm_hoa_don h
      JOIN sys_kho k ON h.ma_ben_xuat = k.ma_kho
      WHERE h.ma_ben_nhap = $1 AND h.loai_hoa_don = 'BAN_HANG'
    `;
    const params = [ma_kh];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_hoa_don >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_hoa_don <= $${params.length}`;
    }
    sql += ` ORDER BY h.ngay_hoa_don DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async chiTietMuaHang(filters = {}) {
    const { ma_ncc, tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT 
        h.so_hoa_don, 
        h.ngay_hoa_don, 
        h.so_don_hang,
        dt.ten_doi_tac as ten_ncc, 
        dt.dia_chi, 
        dt.dien_thoai, 
        dt.ma_so_thue,
        ct.ma_hang_hoa, 
        hh.ten_hang_hoa,
        s.serial_identifier as so_khung,
        s.thuoc_tinh_rieng->>'so_may' as so_may,
        ct.don_gia, 
        ct.so_luong, 
        ct.thanh_tien,
        ct.thue_suat,
        ct.tien_thue,
        h.loai_hoa_don
      FROM tm_hoa_don h
      JOIN dm_doi_tac dt ON h.ma_ben_xuat = dt.ma_doi_tac
      JOIN tm_hoa_don_chi_tiet ct ON h.so_hoa_don = ct.so_hoa_don
      LEFT JOIN tm_hang_hoa hh ON ct.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN tm_hang_hoa_serial s ON ct.ma_serial = s.ma_serial
      WHERE h.loai_hoa_don IN ('MUA_HANG', 'TRA_HANG_MUA')
      AND h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'HOAN_THANH')
    `;
    const params = [];

    if (ma_ncc) {
      params.push(ma_ncc);
      sql += ` AND h.ma_ben_xuat = $${params.length}`;
    }
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_hoa_don >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_hoa_don < ($${params.length}::date + 1)`;
    }

    sql += ` ORDER BY h.ngay_hoa_don DESC, h.so_hoa_don, hh.ten_hang_hoa`;

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  async dashboard(filters = {}, permissions = {}) {
    const { ma_kho, tu_ngay } = filters;
    const { hasMaintenance = true, hasFinancial = true, isAdmin = false } = permissions;
    const client = await pool.connect();

    try {
      await client.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");

      const nowICT = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
      const realToday = nowICT.toISOString().split("T")[0];

      const tuNgay = tu_ngay || realToday.substring(0, 8) + "01";
      const denNgay = filters.den_ngay || realToday;
      const todayRef = denNgay;

      console.log(`DASHBOARD RANGE: ${tuNgay} to ${denNgay} (Ref: ${todayRef})`);

      const ma_kho_arr = ma_kho ? (Array.isArray(ma_kho) ? ma_kho : [ma_kho]) : null;
      const warehouseVal = ma_kho_arr;

      const whereKhoSales = warehouseVal ? ` AND ma_ben_xuat = ANY($2::text[])` : "";
      const whereKhoTC = warehouseVal ? ` AND ma_kho = ANY($2::text[])` : "";
      const whereKhoSerial = warehouseVal ? ` AND ma_kho_hien_tai = ANY($1::text[])` : "";
      const whereKhoTonKho = warehouseVal ? ` AND tk.ma_kho = ANY($1::text[])` : "";

      const sqlRevenueQuery = (isRange, warehouseCond) => {
        const dateCond = isRange ? `BETWEEN $1::date AND $${warehouseVal ? 3 : 2}::date` : "= $1::date";
        const mainDateCond = isRange 
          ? `COALESCE(thoi_gian_ket_thuc, updated_at)::date BETWEEN $1::date AND $${warehouseVal ? 3 : 2}::date` 
          : "COALESCE(thoi_gian_ket_thuc, updated_at)::date = $1::date";

        return `
          SELECT source, SUM(total) as total FROM (
            SELECT 'SALES' as source, SUM(thanh_tien) as total 
            FROM tm_hoa_don 
            WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO', 'DA_XUAT') 
              AND loai_hoa_don = 'BAN_HANG' 
              AND ngay_hoa_don::date ${dateCond}
              ${warehouseCond}
            UNION ALL
            SELECT 'MAINTENANCE' as source, SUM(tong_tien) as total 
            FROM tm_bao_tri 
            WHERE trang_thai = 'HOAN_THANH' 
              AND ${mainDateCond}
              ${warehouseVal ? " AND ma_kho = ANY($2::text[])" : ""}
          ) t GROUP BY source
        `;
      };

      const sqlCashDetailsQuery = (isRange, warehouseCond) => {
        const dateCond = isRange ? `ngay_giao_dich::date BETWEEN $1::date AND $${warehouseVal ? 3 : 2}::date` : "ngay_giao_dich::date = $1::date";
        return `
          SELECT type, SUM(so_tien) as total FROM (
            SELECT 
              CASE 
                WHEN ma_hoa_don IS NOT NULL THEN 'SALES'
                WHEN noi_dung ILIKE '%bảo trì%' OR noi_dung ILIKE '%sửa chữa%' OR noi_dung ILIKE '%BT000%' THEN 'MAINTENANCE'
                ELSE 'OTHER'
              END as type,
              so_tien
            FROM tm_phieu_thu_chi
            WHERE loai_phieu = 'THU' 
              AND trang_thai = 'DA_DUYET' 
              AND ${dateCond}
              ${warehouseCond}
          ) t GROUP BY type
        `;
      };

      const sqlStockXe = `SELECT COUNT(*) as total FROM tm_hang_hoa_serial WHERE trang_thai = 'TON_KHO' ${whereKhoSerial}`;
      const sqlStockXeFixing = (hasMaintenance || isAdmin)
        ? `SELECT COUNT(DISTINCT ma_serial) as total FROM tm_bao_tri WHERE trang_thai IN ('TIEP_NHAN', 'DANG_SUA', 'CHO_THANH_TOAN') ${warehouseVal ? " AND ma_kho = ANY($1::text[])" : ""}`
        : `SELECT 0 as total`;

      const sqlLowStockPT = `
        SELECT COUNT(*) as total 
        FROM tm_hang_hoa_ton_kho tk 
        JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa 
        WHERE (pt.ma_nhom_hang NOT IN (
          WITH RECURSIVE nhom_tree AS (
            SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE'
            UNION ALL
            SELECT n.ma_nhom FROM dm_nhom_hang n INNER JOIN nhom_tree nt ON n.ma_nhom_cha = nt.ma_nhom
          ) SELECT ma_nhom FROM nhom_tree
        ) OR pt.ma_nhom_hang IS NULL) 
        AND (tk.so_luong_ton <= COALESCE(tk.so_luong_toi_thieu, 0) OR tk.so_luong_ton = 0)
        ${whereKhoTonKho}
      `;

      const [revTodayRes, revRangeRes, cashTodayRes, cashRangeRes, stockXeRes, stockXeFixingRes, lowStockRes] = await Promise.all([
        client.query(sqlRevenueQuery(false, whereKhoSales), warehouseVal ? [todayRef, warehouseVal] : [todayRef]),
        client.query(sqlRevenueQuery(true, whereKhoSales), warehouseVal ? [tuNgay, warehouseVal, denNgay] : [tuNgay, denNgay]),
        client.query(sqlCashDetailsQuery(false, whereKhoTC), warehouseVal ? [todayRef, warehouseVal] : [todayRef]),
        client.query(sqlCashDetailsQuery(true, whereKhoTC), warehouseVal ? [tuNgay, warehouseVal, denNgay] : [tuNgay, denNgay]),
        client.query(sqlStockXe, warehouseVal ? [warehouseVal] : []),
        client.query(sqlStockXeFixing, (hasMaintenance || isAdmin) && warehouseVal ? [warehouseVal] : []),
        client.query(sqlLowStockPT, warehouseVal ? [warehouseVal] : []),
      ]);

      const formatBreakdown = (rows, keys) => {
        const result = {};
        keys.forEach((k) => (result[k] = 0));
        rows.forEach((r) => {
          const key = r.source || r.type;
          if (keys.includes(key)) result[key] = Number(r.total || 0);
        });
        return result;
      };

      const revToday = formatBreakdown(revTodayRes.rows, ["SALES", "MAINTENANCE"]);
      const revMonth = formatBreakdown(revRangeRes.rows, ["SALES", "MAINTENANCE"]);
      const cashToday = formatBreakdown(cashTodayRes.rows, ["SALES", "MAINTENANCE", "OTHER"]);
      const cashMonth = formatBreakdown(cashRangeRes.rows, ["SALES", "MAINTENANCE", "OTHER"]);

      const totalRevenueToday = Object.values(revToday).reduce((a, b) => a + b, 0);
      const totalRevenueMonth = Object.values(revMonth).reduce((a, b) => a + b, 0);
      const totalCashToday = Object.values(cashToday).reduce((a, b) => a + b, 0);
      const totalCashMonth = Object.values(cashMonth).reduce((a, b) => a + b, 0);

      const sqlInternalDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_noi_bo ${warehouseVal ? "WHERE (ma_kho_no = ANY($1::text[]) OR ma_kho_co = ANY($1::text[]))" : "WHERE con_lai > 0"}`;
      const sqlCustomerDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_doi_tac WHERE loai_cong_no = 'PHAI_THU' AND con_lai > 0 ${warehouseVal ? "AND ma_kho = ANY($1::text[])" : ""}`;
      const sqlSupplierDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_doi_tac WHERE loai_cong_no = 'PHAI_TRA' AND con_lai > 0 ${warehouseVal ? "AND ma_kho = ANY($1::text[])" : ""}`;

      const sqlRecentActivities = `
        SELECT so_phieu, loai_giao_dich, tong_tien, ngay_lap, dien_giai, ten_doi_tac FROM (
          SELECT h.so_hoa_don as so_phieu, h.loai_hoa_don::varchar as loai_giao_dich, h.thanh_tien as tong_tien, h.ngay_hoa_don::timestamp as ngay_lap, COALESCE(h.ghi_chu, 'Hóa đơn bán hàng') as dien_giai, dt.ten_doi_tac
          FROM tm_hoa_don h LEFT JOIN dm_doi_tac dt ON h.ma_ben_nhap = dt.ma_doi_tac
          WHERE h.loai_hoa_don::text IN ('BAN_HANG') ${warehouseVal ? "AND h.ma_ben_xuat = ANY($1::text[])" : ""}
          UNION ALL
          SELECT h.so_don_hang as so_phieu, CASE WHEN h.loai_don_hang::text IN ('MUA_HANG', 'MUA_XE') THEN 'NHAP_KHO' ELSE h.loai_don_hang::text END as loai_giao_dich, h.thanh_tien as tong_tien, h.ngay_dat_hang::timestamp as ngay_lap, COALESCE(h.ghi_chu, 'Đơn mua hàng/chuyển kho') as dien_giai, dt.ten_doi_tac
          FROM tm_don_hang h LEFT JOIN dm_doi_tac dt ON (h.ma_ben_xuat = dt.ma_doi_tac OR h.ma_ben_nhap = dt.ma_doi_tac)
          WHERE h.loai_don_hang::text IN ('MUA_HANG', 'MUA_XE', 'CHUYEN_KHO') ${warehouseVal ? "AND (h.ma_ben_nhap = ANY($1::text[]) OR h.ma_ben_xuat = ANY($1::text[]))" : ""}
          ${(hasMaintenance || isAdmin) ? `
          UNION ALL
          SELECT b.ma_phieu as so_phieu, 'DICH_VU_BAO_TRI'::varchar as loai_giao_dich, b.tong_tien, COALESCE(b.thoi_gian_ket_thuc, b.created_at)::timestamp as ngay_lap, 'Dịch vụ sửa chữa xe ' || b.ma_serial as dien_giai, dt.ten_doi_tac
          FROM tm_bao_tri b LEFT JOIN dm_doi_tac dt ON b.ma_doi_tac = dt.ma_doi_tac
          WHERE b.trang_thai = 'HOAN_THANH' ${warehouseVal ? "AND b.ma_kho = ANY($1::text[])" : ""}
          ` : ""}
          UNION ALL
          SELECT tc.so_phieu_tc as so_phieu, (CASE WHEN tc.loai_phieu = 'THU' THEN 'PHIEU_THU' ELSE 'PHIEU_CHI' END)::varchar as loai_giao_dich, tc.so_tien as tong_tien, tc.ngay_giao_dich as ngay_lap, tc.noi_dung as dien_giai, dt.ten_doi_tac
          FROM tm_phieu_thu_chi tc LEFT JOIN dm_doi_tac dt ON tc.ma_doi_tac = dt.ma_doi_tac
          WHERE tc.trang_thai = 'DA_DUYET' ${warehouseVal ? "AND tc.ma_kho = ANY($1::text[])" : ""}
        ) as combined ORDER BY ngay_lap DESC LIMIT 10
      `;

      const [intDebtRes, custDebtRes, suppDebtRes, recentActivitiesRes] = await Promise.all([
        client.query(sqlInternalDebt, warehouseVal ? [warehouseVal] : []),
        client.query(sqlCustomerDebt, warehouseVal ? [warehouseVal] : []),
        client.query(sqlSupplierDebt, warehouseVal ? [warehouseVal] : []),
        client.query(sqlRecentActivities, warehouseVal ? [warehouseVal] : []),
      ]);

      return {
        revenue_today: totalRevenueToday,
        revenue_today_detail: revToday,
        revenue_month: totalRevenueMonth,
        revenue_month_detail: revMonth,
        cash_collection_today: totalCashToday,
        cash_collection_today_detail: cashToday,
        cash_collection_month: totalCashMonth,
        cash_collection_month_detail: cashMonth,
        stock_xe: Number(stockXeRes.rows[0].total || 0),
        stock_xe_fixing: Number(stockXeFixingRes.rows[0].total || 0),
        low_stock_pt: Number(lowStockRes.rows[0].total || 0),
        internal_debt: Number(intDebtRes.rows[0].total || 0),
        customer_debt: Number(custDebtRes.rows[0].total || 0),
        supplier_debt: Number(suppDebtRes.rows[0].total || 0),
        giao_dich_gan_day: recentActivitiesRes.rows,
      };
    } finally {
      client.release();
    }
  }

  async bieuDoDoanhThu(filters = {}) {
    const { nam = new Date().getFullYear() } = filters;
    return this.doanhThuTheoThang({ ...filters, nam });
  }

  async bieuDoTonKho(filters = {}) {
    const { ma_kho } = filters;
    let sql = `
      SELECT pt.ten_hang_hoa as label, COUNT(*) as so_luong
      FROM tm_hang_hoa_serial x
      JOIN tm_hang_hoa pt ON x.ma_hang_hoa = pt.ma_hang_hoa
      WHERE x.trang_thai = 'TON_KHO'
    `;
    const params = [];
    if (ma_kho) {
      params.push(Array.isArray(ma_kho) ? ma_kho : [ma_kho]);
      sql += ` AND x.ma_kho_hien_tai = ANY($${params.length}::text[])`;
    }
    sql += ` GROUP BY pt.ten_hang_hoa ORDER BY so_luong DESC LIMIT 10`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }
}

module.exports = new BaoCaoService();
