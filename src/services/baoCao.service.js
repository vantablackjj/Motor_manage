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
      params.push(ma_kho);
      sql += ` AND x.ma_kho_hien_tai = $${params.length}`;
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
    const { ma_kho, nhom_pt, canh_bao } = filters;
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
      params.push(ma_kho);
      sql += ` AND tk.ma_kho = $${params.length}`;
    }
    if (nhom_pt) {
      params.push(nhom_pt);
      sql += ` AND pt.ma_nhom_hang = $${params.length}`;
    }
    if (canh_bao === "true" || canh_bao === true) {
      sql += ` AND tk.so_luong_ton <= tk.so_luong_toi_thieu`;
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
      params.push(ma_kho);
      sqlXe += ` AND x.ma_kho_hien_tai = $1`;
      sqlPT += ` AND tk.ma_kho = $1`;
    }

    sqlXe += ` GROUP BY k.ten_kho`;
    sqlPT += ` GROUP BY k.ten_kho`;

    const [xeRes, ptRes] = await Promise.all([
      pool.query(sqlXe, params),
      pool.query(sqlPT, params),
    ]);
    return {
      xe: xeRes.rows,
      phu_tung: ptRes.rows,
    };
  }

  // ============================================================
  // BÁO CÁO DOANH THU
  // ============================================================

  async doanhThuTheoThang(filters = {}) {
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
      condHD += ` AND h.ma_ben_xuat = $${paramIndex}`;
      condBT += ` AND b.ma_kho = $${paramIndex}`;
      condPTC += ` AND tc.ma_kho = $${paramIndex}`;
      params.push(ma_kho);
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
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND h.loai_hoa_don = 'BAN_HANG'
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
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND h.loai_hoa_don = 'BAN_HANG'
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
          WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND h.loai_hoa_don = 'BAN_HANG'
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

    let sqlThucThu = `
      SELECT EXTRACT(MONTH FROM tc.ngay_giao_dich) as thang, SUM(tc.so_tien) as thuc_thu
      FROM tm_phieu_thu_chi tc
      WHERE tc.loai_phieu = 'THU' AND tc.trang_thai != 'DA_HUY'
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
      condHD += ` AND h.ma_ben_xuat = $${paramIndex}`;
      condBT += ` AND b.ma_kho = $${paramIndex}`;
      condPTC += ` AND tc.ma_kho = $${paramIndex}`;
      params.push(ma_kho);
      paramIndex++;
    }

    const sqlDoanhThu = `
      SELECT t.ma_kho, k.ten_kho, SUM(t.so_luong_hd) as so_luong_hd, SUM(t.doanh_thu) as doanh_thu
      FROM (
        SELECT h.ma_ben_xuat as ma_kho, COUNT(h.so_hoa_don) as so_luong_hd, SUM(h.thanh_tien) as doanh_thu
        FROM tm_hoa_don h
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND h.loai_hoa_don = 'BAN_HANG'
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
      LEFT JOIN sys_kho k ON tc.ma_kho = k.ma_kho
      WHERE tc.loai_phieu = 'THU' AND tc.trang_thai != 'DA_HUY'
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
          ten_kho: tRec.ten_kho || "Không xác định", // Would need another query or join directly, but it's optional
          so_luong_hd: 0,
          doanh_thu: 0,
          thuc_thu: Number(tRec.thuc_thu),
        });
      }
    });

    return result;
  }

  async doanhThuTheoSanPham(filters = {}) {
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
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') 
        AND h.loai_hoa_don = 'BAN_HANG'
        AND (pt.ma_nhom_hang IN (WITH RECURSIVE h AS (SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' UNION ALL SELECT n.ma_nhom FROM dm_nhom_hang n JOIN h ON n.ma_nhom_cha = h.ma_nhom) SELECT ma_nhom FROM h) OR pt.ma_nhom_hang = 'XE')
      `;
    } else {
      sql = `
        SELECT pt.ten_hang_hoa as san_pham, SUM(ct.so_luong) as so_luong, SUM(ct.thanh_tien) as doanh_thu
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') 
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
      params.push(ma_kho);
      sql += ` AND h.ma_ben_xuat = $${params.length}`;
    }

    sql += ` GROUP BY san_pham ORDER BY doanh_thu DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async doanhThuTongHop(filters = {}) {
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
      condHD += ` AND ma_ben_xuat = $${paramIndex}`;
      condBT += ` AND ma_kho = $${paramIndex}`;
      condPTC += ` AND ma_kho = $${paramIndex}`;
      params.push(ma_kho);
      paramIndex++;
    }

    const sqlDoanhThu = `
      SELECT COALESCE(SUM(dt), 0) as tong_doanh_thu, COALESCE(SUM(sl), 0) as tong_hoa_don
      FROM (
        SELECT SUM(thanh_tien) as dt, COUNT(so_hoa_don) as sl FROM tm_hoa_don 
        WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND loai_hoa_don = 'BAN_HANG'
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

  // ============================================================
  // BÁO CÁO LỢI NHUẬN (PROFIT & LOSS)
  // ============================================================

  async baoCaoLoiNhuan(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho, loai } = filters;
    const params = [];
    let paramIndex = 1;

    let cond =
      "WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND h.loai_hoa_don = 'BAN_HANG'";
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
      params.push(ma_kho);
      cond += ` AND h.ma_ben_xuat = $${paramIndex}`;
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
      params.push(ma_kho_xuat);
      sql += ` AND ck.ma_ben_xuat = $${params.length}`;
    }
    if (ma_kho_nhap) {
      params.push(ma_kho_nhap);
      sql += ` AND ck.ma_ben_nhap = $${params.length}`;
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
      params.push(ma_kho);
      sql += ` AND (ck.ma_ben_xuat = $${params.length} OR ck.ma_ben_nhap = $${params.length})`;
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
      params.push(ma_kho);
      sql += ` AND (cn.ma_kho_no = $${params.length} OR cn.ma_kho_co = $${params.length})`;
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
    const { ma_kh, ma_ncc, tu_ngay, den_ngay, loai_cong_no, search } = filters;

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
    const { ma_ncc, tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT 
        dt.ten_doi_tac as ho_ten, 
        cn.ma_doi_tac as ma_ncc,
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
    sql += ` ORDER BY cn.con_lai DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  // ============================================================
  // BÁO CÁO THU CHI
  // ============================================================

  async thuChiTheoNgay(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho, loai } = filters;
    let sql = `
      SELECT 
        ngay_giao_dich, loai_phieu as loai, so_tien, noi_dung as dien_giai, k.ten_kho, so_phieu_tc as so_phieu
      FROM tm_phieu_thu_chi tc
      LEFT JOIN sys_kho k ON tc.ma_kho = k.ma_kho
      WHERE 1=1
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
      params.push(ma_kho);
      sql += ` AND tc.ma_kho = $${params.length}`;
    }
    if (loai) {
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
      WHERE 1=1
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
      WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') 
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

  async dashboard(filters = {}) {
    const { ma_kho, tu_ngay } = filters;
    const today = tu_ngay || new Date().toISOString().split("T")[0];
    const firstDayOfMonth = new Date(
      new Date(today).getFullYear(),
      new Date(today).getMonth(),
      1,
    )
      .toISOString()
      .split("T")[0];

    const whereKho = ma_kho ? ` AND ma_ben_xuat = $2` : "";
    const whereKhoHienTai = ma_kho ? ` AND ma_kho_hien_tai = $1` : "";
    const whereKhoPT = ma_kho ? ` AND tk.ma_kho = $1` : "";

    const sqlRevenueToday = `SELECT SUM(thanh_tien) as total FROM tm_hoa_don WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND loai_hoa_don = 'BAN_HANG' AND ngay_hoa_don = $1${whereKho}`;
    const sqlRevenueMonth = `SELECT SUM(thanh_tien) as total FROM tm_hoa_don WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND loai_hoa_don = 'BAN_HANG' AND ngay_hoa_don >= $1${whereKho}`;
    const sqlStockXe = `SELECT COUNT(*) as total FROM tm_hang_hoa_serial WHERE trang_thai = 'TON_KHO'${whereKhoHienTai}`;
    const sqlStockXeFixing = `
      SELECT COUNT(DISTINCT ma_serial) as total 
      FROM tm_bao_tri 
      WHERE trang_thai IN ('TIEP_NHAN', 'DANG_SUA', 'CHO_THANH_TOAN')
      ${ma_kho ? " AND ma_kho = $1" : ""}
    `;
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
      ${whereKhoPT}
    `;

    const sqlCashCollectionToday = `SELECT SUM(so_tien) as total FROM tm_phieu_thu_chi WHERE loai_phieu = 'THU' AND trang_thai = 'DA_DUYET' AND ngay_giao_dich::date = $1${ma_kho ? " AND ma_kho = $2" : ""}`;
    const sqlCashCollectionMonth = `SELECT SUM(so_tien) as total FROM tm_phieu_thu_chi WHERE loai_phieu = 'THU' AND trang_thai = 'DA_DUYET' AND ngay_giao_dich >= $1${ma_kho ? " AND ma_kho = $2" : ""}`;

    const [
      revTodayRes,
      revMonthRes,
      cashTodayRes,
      cashMonthRes,
      stockXeRes,
      stockXeFixingRes,
      lowStockRes,
    ] = await Promise.all([
      pool.query(sqlRevenueToday, ma_kho ? [today, ma_kho] : [today]),
      pool.query(
        sqlRevenueMonth,
        ma_kho ? [firstDayOfMonth, ma_kho] : [firstDayOfMonth],
      ),
      pool.query(sqlCashCollectionToday, ma_kho ? [today, ma_kho] : [today]),
      pool.query(
        sqlCashCollectionMonth,
        ma_kho ? [firstDayOfMonth, ma_kho] : [firstDayOfMonth],
      ),
      pool.query(sqlStockXe, ma_kho ? [ma_kho] : []),
      pool.query(sqlStockXeFixing, ma_kho ? [ma_kho] : []),
      pool.query(sqlLowStockPT, ma_kho ? [ma_kho] : []),
    ]);

    const sqlInternalDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_noi_bo ${ma_kho ? "WHERE ma_kho_no = $1 OR ma_kho_co = $1" : ""}`;
    const sqlCustomerDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_doi_tac WHERE loai_cong_no = 'PHAI_THU' ${ma_kho ? "AND ma_doi_tac IN (SELECT ma_doi_tac FROM tm_hoa_don WHERE ma_ben_xuat = $1)" : ""}`;
    const sqlSupplierDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_doi_tac WHERE loai_cong_no = 'PHAI_TRA' ${ma_kho ? "AND ma_doi_tac IN (SELECT ma_doi_tac FROM tm_don_hang WHERE ma_ben_nhap = $1)" : ""}`;

    const sqlRecentActivities = `
      SELECT id, so_phieu, loai_giao_dich, tong_tien, ngay_lap FROM (
        SELECT 
          id,
          so_hoa_don as so_phieu, 
          loai_hoa_don::varchar as loai_giao_dich, 
          thanh_tien as tong_tien, 
          ngay_hoa_don::timestamp as ngay_lap 
        FROM tm_hoa_don 
        WHERE loai_hoa_don IN ('BAN_HANG')
        ${ma_kho ? "AND ma_ben_xuat = $1" : ""}
        
        UNION ALL
        
        SELECT 
          id,
          so_don_hang as so_phieu, 
          CASE WHEN loai_don_hang IN ('MUA_HANG', 'MUA_XE') THEN 'NHAP_KHO' ELSE loai_don_hang::varchar END as loai_giao_dich, 
          thanh_tien as tong_tien, 
          ngay_dat_hang::timestamp as ngay_lap 
        FROM tm_don_hang 
        WHERE loai_don_hang IN ('MUA_HANG', 'MUA_XE', 'CHUYEN_KHO')
        ${ma_kho ? "AND (ma_ben_nhap = $1 OR ma_ben_xuat = $1)" : ""}
      ) as combined
      ORDER BY ngay_lap DESC
      LIMIT 10
    `;

    const [intDebtRes, custDebtRes, suppDebtRes, recentActivitiesRes] =
      await Promise.all([
        pool.query(sqlInternalDebt, ma_kho ? [ma_kho] : []),
        pool.query(sqlCustomerDebt, ma_kho ? [ma_kho] : []),
        pool.query(sqlSupplierDebt, ma_kho ? [ma_kho] : []),
        pool.query(sqlRecentActivities, ma_kho ? [ma_kho] : []),
      ]);

    return {
      revenue_today: Number(revTodayRes.rows[0].total || 0),
      revenue_month: Number(revMonthRes.rows[0].total || 0),
      cash_collection_today: Number(cashTodayRes.rows[0].total || 0),
      cash_collection_month: Number(cashMonthRes.rows[0].total || 0),
      stock_xe: Number(stockXeRes.rows[0].total || 0),
      stock_xe_fixing: Number(stockXeFixingRes.rows[0].total || 0),
      low_stock_pt: Number(lowStockRes.rows[0].total || 0),
      internal_debt: Number(intDebtRes.rows[0].total || 0),
      customer_debt: Number(custDebtRes.rows[0].total || 0),
      supplier_debt: Number(suppDebtRes.rows[0].total || 0),
      giao_dich_gan_day: recentActivitiesRes.rows,
    };
  }

  async bieuDoDoanhThu(filters = {}) {
    const { nam = new Date().getFullYear() } = filters;
    return this.doanhThuTheoThang({ nam });
  }

  async bieuDoTonKho(filters = {}) {
    const { ma_kho } = filters;
    let sql = `
      SELECT k.ten_kho, COUNT(*) as so_luong
      FROM tm_hang_hoa_serial x
      JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.trang_thai = 'TON_KHO'
    `;
    const params = [];
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND x.ma_kho_hien_tai = $1`;
    }
    sql += ` GROUP BY k.ten_kho`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }
}

module.exports = new BaoCaoService();
