const { pool } = require("../config/database");

class BaoCaoService {
  // ============================================================
  // BÁO CÁO TỒN KHO
  // ============================================================

  async tonKhoXe(filters = {}) {
    const { ma_kho, ma_loai_xe, ma_mau } = filters;
    let sql = `
      SELECT 
        x.xe_key, x.so_khung, x.so_may, x.gia_nhap, x.ngay_nhap,
        xl.ten_loai, m.ten_mau, k.ten_kho
      FROM tm_xe_thuc_te x
      LEFT JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
      LEFT JOIN sys_mau m ON x.ma_mau = m.ma_mau
      LEFT JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.trang_thai = 'TON_KHO' AND x.status = true
    `;
    const params = [];
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND x.ma_kho_hien_tai = $${params.length}`;
    }
    if (ma_loai_xe) {
      params.push(ma_loai_xe);
      sql += ` AND x.ma_loai_xe = $${params.length}`;
    }
    if (ma_mau) {
      params.push(ma_mau);
      sql += ` AND x.ma_mau = $${params.length}`;
    }
    sql += ` ORDER BY x.ngay_nhap DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async tonKhoPhuTung(filters = {}) {
    const { ma_kho, nhom_pt, canh_bao } = filters;
    let sql = `
      SELECT 
        tk.ma_pt, pt.ten_pt, pt.don_vi_tinh, pt.nhom_pt,
        tk.so_luong_ton, tk.so_luong_khoa, tk.so_luong_toi_thieu,
        k.ten_kho
      FROM tm_phu_tung_ton_kho tk
      JOIN tm_phu_tung pt ON tk.ma_pt = pt.ma_pt
      JOIN sys_kho k ON tk.ma_kho = k.ma_kho
      WHERE 1=1
    `;
    const params = [];
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND tk.ma_kho = $${params.length}`;
    }
    if (nhom_pt) {
      params.push(nhom_pt);
      sql += ` AND pt.nhom_pt = $${params.length}`;
    }
    if (canh_bao === "true" || canh_bao === true) {
      sql += ` AND tk.so_luong_ton <= tk.so_luong_toi_thieu`;
    }
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async tonKhoTongHop() {
    const sqlXe = `
      SELECT k.ten_kho, COUNT(*) as so_luong, SUM(gia_nhap) as gia_tri
      FROM tm_xe_thuc_te x
      JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.trang_thai = 'TON_KHO' AND x.status = true
      GROUP BY k.ten_kho
    `;
    const sqlPT = `
      SELECT k.ten_kho, SUM(tk.so_luong_ton) as so_luong, SUM(tk.so_luong_ton * pt.gia_nhap) as gia_tri
      FROM tm_phu_tung_ton_kho tk
      JOIN tm_phu_tung pt ON tk.ma_pt = pt.ma_pt
      JOIN sys_kho k ON tk.ma_kho = k.ma_kho
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
        EXTRACT(MONTH FROM ngay_ban) as thang,
        COUNT(id) as so_luong_hd,
        SUM(tong_tien) as doanh_thu,
        SUM(thanh_toan) as thuc_thu
      FROM tm_hoa_don_ban
      WHERE EXTRACT(YEAR FROM ngay_ban) = $1 AND trang_thai = 'DA_DUYET'
    `;
    const params = [currentYear];
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND ma_kho_xuat = $2`;
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
        SUM(h.thanh_toan) as thuc_thu
      FROM tm_hoa_don_ban h
      JOIN sys_kho k ON h.ma_kho_xuat = k.ma_kho
      WHERE h.trang_thai = 'DA_DUYET'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_ban >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_ban <= $${params.length}`;
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
        SELECT xl.ten_loai as san_pham, COUNT(*) as so_luong, SUM(ct.thanh_tien) as doanh_thu
        FROM tm_hoa_don_ban_ct ct
        JOIN tm_hoa_don_ban h ON ct.ma_hd = h.so_hd
        JOIN tm_xe_thuc_te x ON ct.xe_key = x.xe_key
        JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
        WHERE h.trang_thai = 'DA_DUYET' AND ct.loai_hang = 'XE'
      `;
    } else {
      sql = `
        SELECT pt.ten_pt as san_pham, SUM(ct.so_luong) as so_luong, SUM(ct.thanh_tien) as doanh_thu
        FROM tm_hoa_don_ban_ct ct
        JOIN tm_hoa_don_ban h ON ct.ma_hd = h.so_hd
        JOIN tm_phu_tung pt ON ct.ma_pt = pt.ma_pt
        WHERE h.trang_thai = 'DA_DUYET' AND ct.loai_hang = 'PHU_TUNG'
      `;
    }

    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_ban >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_ban <= $${params.length}`;
    }
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND h.ma_kho_xuat = $${params.length}`;
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
        SUM(thanh_toan) as tong_thuc_thu,
        COUNT(id) as tong_hoa_don
      FROM tm_hoa_don_ban
      WHERE trang_thai = 'DA_DUYET'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ngay_ban >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ngay_ban <= $${params.length}`;
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
        ls.*, k_xuat.ten_kho as kho_xuat, k_nhap.ten_kho as kho_nhap,
        xl.ten_loai, m.ten_mau
      FROM tm_xe_lich_su ls
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      LEFT JOIN tm_xe_thuc_te x ON ls.xe_key = x.xe_key
      LEFT JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
      LEFT JOIN sys_mau m ON x.ma_mau = m.ma_mau
      WHERE 1=1
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ls.ngay_giao_dich >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ls.ngay_giao_dich <= $${params.length}`;
    }
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND (ls.ma_kho_xuat = $${params.length} OR ls.ma_kho_nhap = $${params.length})`;
    }
    if (loai_giao_dich) {
      params.push(loai_giao_dich);
      sql += ` AND ls.loai_giao_dich = $${params.length}`;
    }
    sql += ` ORDER BY ls.ngay_giao_dich DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async nhapXuatPhuTung(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho, ma_pt } = filters;
    let sql = `
      SELECT 
        ls.*, k_xuat.ten_kho as kho_xuat, k_nhap.ten_kho as kho_nhap,
        pt.ten_pt, pt.don_vi_tinh
      FROM tm_phu_tung_lich_su ls
      LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
      LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
      JOIN tm_phu_tung pt ON ls.ma_pt = pt.ma_pt
      WHERE 1=1
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ls.ngay_giao_dich >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ls.ngay_giao_dich <= $${params.length}`;
    }
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND (ls.ma_kho_xuat = $${params.length} OR ls.ma_kho_nhap = $${params.length})`;
    }
    if (ma_pt) {
      params.push(ma_pt);
      sql += ` AND ls.ma_pt = $${params.length}`;
    }
    sql += ` ORDER BY ls.ngay_giao_dich DESC`;
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
        ck.so_phieu, ck.ngay_chuyen_kho, ck.trang_thai,
        kx.ten_kho as kho_xuat, kn.ten_kho as kho_nhap,
        ck.nguoi_tao, ck.nguoi_duyet
      FROM tm_chuyen_kho ck
      JOIN sys_kho kx ON ck.ma_kho_xuat = kx.ma_kho
      JOIN sys_kho kn ON ck.ma_kho_nhap = kn.ma_kho
      WHERE 1=1
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ck.ngay_chuyen_kho >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ck.ngay_chuyen_kho <= $${params.length}`;
    }
    if (ma_kho_xuat) {
      params.push(ma_kho_xuat);
      sql += ` AND ck.ma_kho_xuat = $${params.length}`;
    }
    if (ma_kho_nhap) {
      params.push(ma_kho_nhap);
      sql += ` AND ck.ma_kho_nhap = $${params.length}`;
    }
    sql += ` ORDER BY ck.ngay_chuyen_kho DESC`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async chuyenKhoChiTiet(filters = {}) {
    const { tu_ngay, den_ngay, ma_kho } = filters;
    let sql = `
      SELECT 
        ck.so_phieu, ck.ngay_chuyen_kho,
        kx.ten_kho as kho_xuat, kn.ten_kho as kho_nhap,
        COALESCE(xl.ten_loai, pt.ten_pt) as hang_hoa,
        COALESCE(x.so_khung, '') as so_khung,
        COALESCE(ck_pt.so_luong, 1) as so_luong
      FROM tm_chuyen_kho ck
      JOIN sys_kho kx ON ck.ma_kho_xuat = kx.ma_kho
      JOIN sys_kho kn ON ck.ma_kho_nhap = kn.ma_kho
      LEFT JOIN tm_chuyen_kho_xe ckx ON ck.so_phieu = ckx.ma_phieu
      LEFT JOIN tm_xe_thuc_te x ON ckx.xe_key = x.xe_key
      LEFT JOIN tm_xe_loai xl ON x.ma_loai_xe = xl.ma_loai
      LEFT JOIN tm_chuyen_kho_phu_tung ck_pt ON ck.so_phieu = ck_pt.ma_phieu
      LEFT JOIN tm_phu_tung pt ON ck_pt.ma_pt = pt.ma_pt
      WHERE 1=1
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ck.ngay_chuyen_kho >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ck.ngay_chuyen_kho <= $${params.length}`;
    }
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND (ck.ma_kho_xuat = $${params.length} OR ck.ma_kho_nhap = $${params.length})`;
    }
    sql += ` ORDER BY ck.ngay_chuyen_kho DESC, ck.so_phieu`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  // ============================================================
  // BÁO CÁO CÔNG NỢ
  // ============================================================

  async congNoNoiBo(filters = {}) {
    const { ma_kho } = filters;
    let sql = `
      SELECT 
        cn.*,
        kx.ten_kho as kho_no,
        kn.ten_kho as kho_co
      FROM tm_cong_no_kho cn
      JOIN sys_kho kx ON cn.ma_kho_no = kx.ma_kho
      JOIN sys_kho kn ON cn.ma_kho_co = kn.ma_kho
      WHERE cn.con_lai > 0
    `;
    const params = [];
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND (cn.ma_kho_no = $1 OR cn.ma_kho_co = $1)`;
    }
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async congNoKhachHang(filters = {}) {
    const { ma_kh, tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT 
        kh.ho_ten, kh.ma_kh,
        SUM(h.thanh_toan) as tong_phai_tra,
        SUM(COALESCE(tc.so_tien, 0)) as da_tra,
        SUM(h.thanh_toan - COALESCE(tc.so_tien, 0)) as con_lai
      FROM tm_khach_hang kh
      JOIN tm_hoa_don_ban h ON kh.ma_kh = h.ma_kh
      LEFT JOIN tm_thu_chi tc ON h.so_hd = tc.lien_ket_phieu AND tc.trang_thai = 'DA_DUYET'
      WHERE h.trang_thai = 'DA_DUYET'
    `;
    const params = [];
    if (ma_kh) {
      params.push(ma_kh);
      sql += ` AND kh.ma_kh = $${params.length}`;
    }
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_ban >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_ban <= $${params.length}`;
    }
    sql += ` GROUP BY kh.ho_ten, kh.ma_kh HAVING SUM(h.thanh_toan - COALESCE(tc.so_tien, 0)) > 0`;
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
        ngay_giao_dich, loai, so_tien, dien_giai, k.ten_kho, so_phieu
      FROM tm_thu_chi tc
      JOIN sys_kho k ON tc.ma_kho = k.ma_kho
      WHERE tc.trang_thai = 'DA_DUYET'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ngay_giao_dich >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ngay_giao_dich <= $${params.length}`;
    }
    if (ma_kho) {
      params.push(ma_kho);
      sql += ` AND tc.ma_kho = $${params.length}`;
    }
    if (loai) {
      params.push(loai);
      sql += ` AND loai = $${params.length}`;
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
        SUM(CASE WHEN loai = 'THU' THEN so_tien ELSE 0 END) as tong_thu,
        SUM(CASE WHEN loai = 'CHI' THEN so_tien ELSE 0 END) as tong_chi
      FROM tm_thu_chi tc
      JOIN sys_kho k ON tc.ma_kho = k.ma_kho
      WHERE tc.trang_thai = 'DA_DUYET'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND ngay_giao_dich >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND ngay_giao_dich <= $${params.length}`;
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
      SELECT kh.ho_ten, COUNT(h.id) as so_luong_hd, SUM(h.thanh_toan) as tong_chi_tieu
      FROM tm_khach_hang kh
      JOIN tm_hoa_don_ban h ON kh.ma_kh = h.ma_kh
      WHERE h.trang_thai = 'DA_DUYET'
    `;
    const params = [];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_ban >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_ban <= $${params.length}`;
    }
    sql += ` GROUP BY kh.ho_ten ORDER BY tong_chi_tieu DESC LIMIT $${
      params.length + 1
    }`;
    params.push(limit);
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async lichSuMuaHang(filters = {}) {
    const { ma_kh, tu_ngay, den_ngay } = filters;
    let sql = `
      SELECT h.so_hd, h.ngay_ban, h.thanh_toan, h.trang_thai, k.ten_kho
      FROM tm_hoa_don_ban h
      JOIN sys_kho k ON h.ma_kho_xuat = k.ma_kho
      WHERE h.ma_kh = $1
    `;
    const params = [ma_kh];
    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND h.ngay_ban >= $${params.length}`;
    }
    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND h.ngay_ban <= $${params.length}`;
    }
    sql += ` ORDER BY h.ngay_ban DESC`;
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
      1
    )
      .toISOString()
      .split("T")[0];

    const sqlRevenueToday = `SELECT SUM(thanh_toan) as total FROM tm_hoa_don_ban WHERE trang_thai = 'DA_DUYET' AND ngay_ban = $1`;
    const sqlRevenueMonth = `SELECT SUM(thanh_toan) as total FROM tm_hoa_don_ban WHERE trang_thai = 'DA_DUYET' AND ngay_ban >= $1`;
    const sqlStockXe = `SELECT COUNT(*) as total FROM tm_xe_thuc_te WHERE trang_thai = 'TON_KHO' AND status = true`;
    const sqlLowStockPT = `
      SELECT COUNT(*) as total 
      FROM tm_phu_tung_ton_kho tk 
      JOIN tm_phu_tung pt ON tk.ma_pt = pt.ma_pt 
      WHERE tk.so_luong_ton <= tk.so_luong_toi_thieu
    `;
    const sqlInternalDebt = `SELECT SUM(con_lai) as total FROM tm_cong_no_kho`;
    const sqlCustomerDebt = `
      SELECT SUM(h.thanh_toan - COALESCE(tc.so_tien, 0)) as total
      FROM tm_hoa_don_ban h
      LEFT JOIN tm_thu_chi tc ON h.so_hd = tc.lien_ket_phieu AND tc.trang_thai = 'DA_DUYET'
      WHERE h.trang_thai = 'DA_DUYET'
    `;

    const [
      revTodayRes,
      revMonthRes,
      stockXeRes,
      lowStockRes,
      intDebtRes,
      custDebtRes,
    ] = await Promise.all([
      pool.query(sqlRevenueToday, [today]),
      pool.query(sqlRevenueMonth, [firstDayOfMonth]),
      pool.query(sqlStockXe),
      pool.query(sqlLowStockPT),
      pool.query(sqlInternalDebt),
      pool.query(sqlCustomerDebt),
    ]);

    return {
      revenue_today: Number(revTodayRes.rows[0].total || 0),
      revenue_month: Number(revMonthRes.rows[0].total || 0),
      stock_xe: Number(stockXeRes.rows[0].total || 0),
      low_stock_pt: Number(lowStockRes.rows[0].total || 0),
      internal_debt: Number(intDebtRes.rows[0].total || 0),
      customer_debt: Number(custDebtRes.rows[0].total || 0),
    };
  }

  async bieuDoDoanhThu(filters = {}) {
    const { nam = new Date().getFullYear() } = filters;
    return this.doanhThuTheoThang({ nam });
  }

  async bieuDoTonKho() {
    const sql = `
      SELECT k.ten_kho, COUNT(*) as so_luong
      FROM tm_xe_thuc_te x
      JOIN sys_kho k ON x.ma_kho_hien_tai = k.ma_kho
      WHERE x.trang_thai = 'TON_KHO' AND x.status = true
      GROUP BY k.ten_kho
    `;
    const { rows } = await pool.query(sql);
    return rows;
  }
}

module.exports = new BaoCaoService();
