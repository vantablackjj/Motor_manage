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
      AND (pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang = 'XE')
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
      WHERE (pt.ma_nhom_hang NOT IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang IS NULL)
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

  async tonKhoTongHop() {
    const sqlXe = `
      SELECT k.ten_kho, COUNT(*) as so_luong, SUM(pt.gia_von_mac_dinh) as gia_tri
      FROM tm_hang_hoa_serial x
      JOIN tm_hang_hoa pt ON x.ma_hang_hoa = pt.ma_hang_hoa
      JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.trang_thai = 'TON_KHO'
      AND (pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang = 'XE')
      GROUP BY k.ten_kho
    `;
    const sqlPT = `
      SELECT k.ten_kho, SUM(tk.so_luong_ton) as so_luong, SUM(tk.so_luong_ton * pt.gia_von_mac_dinh) as gia_tri
      FROM tm_hang_hoa_ton_kho tk
      JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa
      JOIN sys_kho k ON tk.ma_kho = k.ma_kho
      WHERE (pt.ma_nhom_hang NOT IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang IS NULL)
      GROUP BY k.ten_kho
    `;
    const [xeRes, ptRes] = await Promise.all([
      pool.query(sqlXe),
      pool.query(sqlPT),
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
    const { nam, ma_kho } = filters;
    const currentYear = nam || new Date().getFullYear();
    let sql = `
      SELECT 
        EXTRACT(MONTH FROM ngay_hoa_don) as thang,
        COUNT(id) as so_luong_hd,
        SUM(tong_tien) as doanh_thu,
        SUM(thanh_tien) as thuc_thu
      FROM tm_hoa_don
      WHERE EXTRACT(YEAR FROM ngay_hoa_don) = $1 AND trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO')
    `;
    const params = [currentYear];
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND ma_ben_xuat = $2`;
    }
    sql += ` GROUP BY thang ORDER BY thang`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async doanhThuTheoKho(filters = {}) {
    const { tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT 
        k.ten_kho,
        COUNT(h.id) as so_luong_hd,
        SUM(h.tong_tien) as doanh_thu,
        SUM(h.thanh_tien) as thuc_thu
      FROM tm_hoa_don h
      JOIN sys_kho k ON h.ma_ben_xuat = k.ma_kho
      WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO')
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_hoa_don >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_hoa_don < ($${params.length}::date + 1)`;
    }
    sql += ` GROUP BY k.ten_kho`;
    const { rows } = await pool.query(sql, params);
    return rows;
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
        AND (pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang = 'XE')
      `;
    } else {
      sql = `
        SELECT pt.ten_hang_hoa as san_pham, SUM(ct.so_luong) as so_luong, SUM(ct.thanh_tien) as doanh_thu
        FROM tm_hoa_don_chi_tiet ct
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        JOIN tm_hang_hoa pt ON ct.ma_hang_hoa = pt.ma_hang_hoa
        WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') 
        AND (pt.ma_nhom_hang NOT IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang IS NULL)
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
    const { tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT 
        SUM(tong_tien) as tong_doanh_thu,
        SUM(thanh_tien) as tong_thuc_thu,
        COUNT(id) as tong_hoa_don
      FROM tm_hoa_don
      WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO')
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ngay_hoa_don >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ngay_hoa_don < ($${params.length}::date + 1)`;
    }
    const { rows } = await pool.query(sql, params);
    return rows[0];
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
        ) as kho_xuat,
        
        -- Identification of Destination (Kho nhap / Khach hang)
        COALESCE(
          k_nhap.ten_kho, 
          kh_hd.ten_doi_tac,
          CASE WHEN ls.loai_giao_dich IN ('XUAT', 'XUAT_KHO', 'BAN', 'BAN_HANG') THEN 'Khách hàng' ELSE NULL END
        ) as kho_nhap,
        
        pt.ten_hang_hoa as ten_loai, 
        COALESCE(x.thuoc_tinh_rieng->>'ten_mau', x.thuoc_tinh_rieng->>'ma_mau') as ten_mau,
        x.serial_identifier as so_khung
      FROM tm_hang_hoa_lich_su ls
      -- Junction 1: Basic joins
      LEFT JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN tm_hang_hoa_serial x ON ls.ma_serial = x.ma_serial
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      
      -- Junction 2: Link to Purchase Order (Source of many imports)
      LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang 
      LEFT JOIN dm_doi_tac ncc_po ON po.ma_ben_xuat = ncc_po.ma_doi_tac AND po.loai_ben_xuat = 'DOI_TAC'
      
      -- Junction 3: Link to Invoice (Source of sales or alternate purchase tracking)
      LEFT JOIN tm_hoa_don hd ON ls.so_chung_tu = hd.so_hoa_don 
      LEFT JOIN dm_doi_tac ncc_hd ON hd.ma_ben_xuat = ncc_hd.ma_doi_tac AND hd.loai_ben_xuat = 'DOI_TAC'
      LEFT JOIN dm_doi_tac kh_hd ON hd.ma_ben_nhap = kh_hd.ma_doi_tac AND hd.loai_ben_nhap = 'DOI_TAC'

      WHERE (
        pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) 
        OR pt.ma_nhom_hang = 'XE'
        OR pt.loai_quan_ly = 'SERIAL' -- More inclusive fallback
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
        ) as kho_xuat, 
        
        -- Identification of Destination
        COALESCE(
          k_nhap.ten_kho, 
          kh_hd.ten_doi_tac,
          CASE WHEN ls.loai_giao_dich IN ('XUAT', 'XUAT_KHO', 'BAN', 'BAN_HANG') THEN 'Khách hàng' ELSE NULL END
        ) as kho_nhap,
        
        pt.ten_hang_hoa as ten_pt, pt.don_vi_tinh
      FROM tm_hang_hoa_lich_su ls
      -- Basic joins
      LEFT JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      
      -- Link to PO (so_chung_tu might be POP...)
      LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang 
      LEFT JOIN dm_doi_tac ncc_po ON po.ma_ben_xuat = ncc_po.ma_doi_tac AND po.loai_ben_xuat = 'DOI_TAC'
      
      -- Link to Invoice (so_chung_tu might be PNK... or HD...)
      LEFT JOIN tm_hoa_don hd ON ls.so_chung_tu = hd.so_hoa_don 
      LEFT JOIN dm_doi_tac ncc_hd ON hd.ma_ben_xuat = ncc_hd.ma_doi_tac AND hd.loai_ben_xuat = 'DOI_TAC'
      LEFT JOIN dm_doi_tac kh_hd ON hd.ma_ben_nhap = kh_hd.ma_doi_tac AND hd.loai_ben_nhap = 'DOI_TAC'

      WHERE (
        pt.ma_nhom_hang NOT IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) 
        OR pt.ma_nhom_hang IS NULL
      )
      AND pt.loai_quan_ly != 'SERIAL'
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
    const { ma_kh, ma_ncc, tu_ngay, den_ngay, loai_cong_no } = filters;

    // If specific type is requested, return only that type
    if (loai_cong_no === "PHAI_TRA") {
      return this.congNoNhaCungCap(filters);
    } else if (loai_cong_no === "PHAI_THU") {
      // Return only customer debts
      let sql = `
        SELECT 
          dt.ten_doi_tac as ho_ten, 
          cn.ma_doi_tac as ma_kh,
          cn.loai_cong_no,
          cn.tong_no as tong_phai_tra,
          cn.tong_da_thanh_toan as da_tra,
          cn.con_lai,
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
      if (tu_ngay) {
        params.push(tu_ngay);
        sql += ` AND cn.updated_at >= $${params.length}`;
      }
      if (den_ngay) {
        params.push(den_ngay);
        sql += ` AND cn.updated_at < ($${params.length}::date + 1)`;
      }
      sql += ` ORDER BY cn.con_lai DESC`;
      const { rows } = await pool.query(sql, params);
      return rows;
    }

    // Return both customer and supplier debts
    let sqlKhachHang = `
      SELECT 
        dt.ten_doi_tac as ho_ten, 
        cn.ma_doi_tac,
        'KHACH_HANG' as loai_doi_tac,
        cn.loai_cong_no,
        cn.tong_no as tong_phai_tra,
        cn.tong_da_thanh_toan as da_tra,
        cn.con_lai,
        cn.updated_at as ngay_cap_nhat
      FROM tm_cong_no_doi_tac cn
      JOIN dm_doi_tac dt ON cn.ma_doi_tac = dt.ma_doi_tac
      WHERE cn.loai_cong_no = 'PHAI_THU' AND cn.con_lai > 0
    `;

    let sqlNhaCungCap = `
      SELECT 
        dt.ten_doi_tac as ho_ten, 
        cn.ma_doi_tac,
        'NHA_CUNG_CAP' as loai_doi_tac,
        cn.loai_cong_no,
        cn.tong_no as tong_phai_tra,
        cn.tong_da_thanh_toan as da_tra,
        cn.con_lai,
        cn.updated_at as ngay_cap_nhat
      FROM tm_cong_no_doi_tac cn
      JOIN dm_doi_tac dt ON cn.ma_doi_tac = dt.ma_doi_tac
      WHERE cn.loai_cong_no = 'PHAI_TRA' AND cn.con_lai > 0
    `;

    const params = [];
    let filterClause = "";

    if (ma_kh) {
      params.push(ma_kh);
      filterClause += ` AND cn.ma_doi_tac = $${params.length}`;
    }
    if (ma_ncc && !ma_kh) {
      params.push(ma_ncc);
      filterClause += ` AND cn.ma_doi_tac = $${params.length}`;
    }
    if (tu_ngay) {
      params.push(tu_ngay);
      filterClause += ` AND cn.updated_at >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      filterClause += ` AND cn.updated_at < ($${params.length}::date + 1)`;
    }

    sqlKhachHang += filterClause;
    sqlNhaCungCap += filterClause;

    // Combine both queries with UNION ALL
    const combinedSql = `
      (${sqlKhachHang})
      UNION ALL
      (${sqlNhaCungCap})
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
        cn.tong_no as tong_phai_tra,
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
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND cn.updated_at >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND cn.updated_at < ($${params.length}::date + 1)`;
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
      SELECT kh.ten_doi_tac as ho_ten, COUNT(h.id) as so_luong_hd, SUM(h.thanh_tien) as tong_chi_tieu
      FROM dm_doi_tac kh
      JOIN tm_hoa_don h ON kh.ma_doi_tac = h.ma_ben_nhap
      WHERE h.trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND kh.loai_doi_tac IN ('KHACH_HANG', 'CA_HAI')
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

  // ============================================================
  // DASHBOARD
  // ============================================================

  async dashboard(filters = {}) {
    const today = new Date().toISOString().split("T")[0];
    const firstDayOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split("T")[0];

    const sqlRevenueToday = `SELECT SUM(thanh_tien) as total FROM tm_hoa_don WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND ngay_hoa_don = $1`;
    const sqlRevenueMonth = `SELECT SUM(thanh_tien) as total FROM tm_hoa_don WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND ngay_hoa_don >= $1`;
    const sqlStockXe = `SELECT COUNT(*) as total FROM tm_hang_hoa_serial WHERE trang_thai = 'TON_KHO'`;
    const sqlLowStockPT = `
      SELECT COUNT(*) as total 
      FROM tm_hang_hoa_ton_kho tk 
      JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa 
      WHERE (pt.ma_nhom_hang NOT IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang IS NULL) 
      AND tk.so_luong_ton <= tk.so_luong_toi_thieu
    `;
    const sqlInternalDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_noi_bo`;
    const sqlCustomerDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_doi_tac WHERE loai_cong_no = 'PHAI_THU'`;
    const sqlSupplierDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_doi_tac WHERE loai_cong_no = 'PHAI_TRA'`;
    const [
      revTodayRes,
      revMonthRes,
      stockXeRes,
      lowStockRes,
      intDebtRes,
      custDebtRes,
      suppDebtRes,
    ] = await Promise.all([
      pool.query(sqlRevenueToday, [today]),
      pool.query(sqlRevenueMonth, [firstDayOfMonth]),
      pool.query(sqlStockXe),
      pool.query(sqlLowStockPT),
      pool.query(sqlInternalDebt),
      pool.query(sqlCustomerDebt),
      pool.query(sqlSupplierDebt),
    ]);

    return {
      revenue_today: Number(revTodayRes.rows[0].total || 0),
      revenue_month: Number(revMonthRes.rows[0].total || 0),
      stock_xe: Number(stockXeRes.rows[0].total || 0),
      low_stock_pt: Number(lowStockRes.rows[0].total || 0),
      internal_debt: Number(intDebtRes.rows[0].total || 0),
      customer_debt: Number(custDebtRes.rows[0].total || 0),
      supplier_debt: Number(suppDebtRes.rows[0].total || 0),
    };
  }

  async bieuDoDoanhThu(filters = {}) {
    const { nam = new Date().getFullYear() } = filters;
    return this.doanhThuTheoThang({ nam });
  }

  async bieuDoTonKho() {
    const sql = `
      SELECT k.ten_kho, COUNT(*) as so_luong
      FROM tm_hang_hoa_serial x
      JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.trang_thai = 'TON_KHO'
      GROUP BY k.ten_kho
    `;
    const { rows } = await pool.query(sql);
    return rows;
  }
}

module.exports = new BaoCaoService();
