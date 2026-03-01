const { query } = require("../config/database");

class DichVuSauBanService {
  /**
   * Lấy danh sách xe đã bán, có thể filter theo trạng thái đăng ký/đăng kiểm
   * @param {object} filters - { trang_thai, so_hoa_don, ma_doi_tac, page, limit }
   *   trang_thai: 'chua_dang_ky' | 'chua_dang_kiem' | 'hoan_thanh' | 'pending'
   */
  static async getList(filters = {}) {
    const {
      trang_thai,
      so_hoa_don,
      ma_doi_tac,
      search,
      page = 1,
      limit = 20,
    } = filters;
    const safeLimit = Math.min(Number(limit) || 20, 100);
    const offset = (Number(page) - 1) * safeLimit;

    let conditions = [
      "x.trang_thai = 'DA_BAN'",
      "x.so_hoa_don_ban IS NOT NULL",
    ];
    const params = [];
    let idx = 1;

    if (trang_thai === "chua_dang_ky") {
      conditions.push(`x.dang_ky_xe = FALSE`);
    } else if (trang_thai === "chua_dang_kiem") {
      conditions.push(`x.dang_kiem = FALSE`);
    } else if (trang_thai === "hoan_thanh") {
      conditions.push(`x.dang_ky_xe = TRUE AND x.dang_kiem = TRUE`);
    } else if (trang_thai === "pending") {
      // Còn ít nhất 1 dịch vụ chưa hoàn thành
      conditions.push(`(x.dang_ky_xe = FALSE OR x.dang_kiem = FALSE)`);
    }

    if (so_hoa_don) {
      params.push(so_hoa_don);
      conditions.push(`x.so_hoa_don_ban = $${idx++}`);
    }

    if (ma_doi_tac) {
      // Tìm qua bảng hóa đơn bán
      params.push(ma_doi_tac);
      conditions.push(`hd.ma_ben_nhap = $${idx++}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(x.serial_identifier ILIKE $${idx} OR x.bien_so ILIKE $${idx} OR kh.ten_doi_tac ILIKE $${idx} OR x.so_hoa_don_ban ILIKE $${idx})`,
      );
      idx++;
    }

    const where = conditions.join(" AND ");

    const sql = `
      SELECT
        x.ma_serial AS xe_key,
        x.serial_identifier AS so_khung,
        x.ma_hang_hoa AS ma_loai_xe,
        hh.ten_hang_hoa AS ten_xe,
        x.so_hoa_don_ban,
        x.ngay_ban,
        kh.ma_doi_tac AS ma_khach_hang,
        kh.ten_doi_tac AS ten_khach_hang,
        kh.dien_thoai,
        -- Đăng ký
        x.dang_ky_xe AS is_registered,
        x.bien_so,
        x.ngay_tra_dang_ky AS ngay_tra_bien,
        x.nguoi_lam_dang_ky,
        u_dk.ho_ten as ten_nguoi_lam_dang_ky,
        -- Đăng kiểm
        x.dang_kiem AS is_inspected,
        x.ngay_tra_dang_kiem AS ngay_tra_giay_dang_kiem,
        x.han_dang_kiem,
        x.nguoi_lam_dang_kiem,
        u_ki.ho_ten as ten_nguoi_lam_dang_kiem,
        x.ghi_chu_dich_vu,
        kh.dien_thoai AS so_dien_thoai,
        COUNT(*) OVER() AS total_count
      FROM tm_hang_hoa_serial x
      JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN tm_hoa_don hd ON x.so_hoa_don_ban = hd.so_hoa_don
      LEFT JOIN tm_don_hang dh ON x.so_hoa_don_ban = dh.so_don_hang
      LEFT JOIN dm_doi_tac kh ON COALESCE(hd.ma_ben_nhap, dh.ma_ben_nhap) = kh.ma_doi_tac
      LEFT JOIN sys_user u_dk ON x.nguoi_lam_dang_ky::text = u_dk.id::text
      LEFT JOIN sys_user u_ki ON x.nguoi_lam_dang_kiem::text = u_ki.id::text
      WHERE ${where}
      ORDER BY x.ngay_ban DESC NULLS LAST, x.ma_serial
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(safeLimit, offset);

    const result = await query(sql, params);
    const total =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    return {
      data: result.rows.map((r) => {
        const { total_count, ...rest } = r;
        return rest;
      }),
      pagination: {
        page: Number(page),
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Lấy chi tiết một xe (trạng thái dịch vụ sau bán)
   */
  static async getByXeKey(xe_key) {
    const result = await query(
      `SELECT
        x.ma_serial AS xe_key,
        x.serial_identifier AS so_khung,
        x.ma_hang_hoa AS ma_loai_xe,
        hh.ten_hang_hoa AS ten_xe,
        x.so_hoa_don_ban,
        x.ngay_ban,
        kh.ma_doi_tac AS ma_khach_hang,
        kh.ten_doi_tac AS ten_khach_hang,
        kh.dien_thoai AS so_dien_thoai,
        x.dang_ky_xe AS is_registered, x.bien_so, x.ngay_tra_dang_ky AS ngay_tra_bien, x.nguoi_lam_dang_ky,
        u_dk.ho_ten as ten_nguoi_lam_dang_ky,
        x.dang_kiem AS is_inspected, x.ngay_tra_dang_kiem AS ngay_tra_giay_dang_kiem, x.han_dang_kiem, x.nguoi_lam_dang_kiem,
        u_ki.ho_ten as ten_nguoi_lam_dang_kiem,
        x.ghi_chu_dich_vu,
        x.trang_thai
      FROM tm_hang_hoa_serial x
      JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN tm_hoa_don hd ON x.so_hoa_don_ban = hd.so_hoa_don
      LEFT JOIN tm_don_hang dh ON x.so_hoa_don_ban = dh.so_don_hang
      LEFT JOIN dm_doi_tac kh ON COALESCE(hd.ma_ben_nhap, dh.ma_ben_nhap) = kh.ma_doi_tac
      LEFT JOIN sys_user u_dk ON x.nguoi_lam_dang_ky::text = u_dk.id::text
      LEFT JOIN sys_user u_ki ON x.nguoi_lam_dang_kiem::text = u_ki.id::text
      WHERE x.ma_serial = $1`,
      [xe_key],
    );
    return result.rows[0] || null;
  }

  /**
   * Cập nhật trạng thái đăng ký + biển số
   * @param {string} xe_key
   * @param {object} data - { bien_so, ngay_tra_dang_ky }
   * @param {string} nguoi_thuc_hien - username
   */
  static async capNhatDangKy(xe_key, data, nguoi_thuc_hien) {
    const { bien_so, ngay_tra_bien, ghi_chu } = data;
    const ngay_tra_dang_ky = ngay_tra_bien;

    if (!bien_so || !bien_so.trim()) {
      throw {
        status: 400,
        message: "Biển số không được để trống khi cập nhật đăng ký",
      };
    }

    const result = await query(
      `UPDATE tm_hang_hoa_serial
       SET dang_ky_xe = TRUE,
           bien_so = $2,
           ngay_tra_dang_ky = COALESCE($3::date, CURRENT_DATE),
           nguoi_lam_dang_ky = $4,
           ghi_chu_dich_vu = COALESCE($5, ghi_chu_dich_vu),
           updated_at = CURRENT_TIMESTAMP
       WHERE ma_serial = $1 AND trang_thai = 'DA_BAN'
       RETURNING *`,
      [
        xe_key,
        bien_so.trim().toUpperCase(),
        ngay_tra_dang_ky || null,
        nguoi_thuc_hien,
        ghi_chu,
      ],
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: "Xe không tồn tại hoặc chưa được bán" };
    }
    return result.rows[0];
  }

  /**
   * Cập nhật trạng thái đăng kiểm + ngày trả
   * @param {string} xe_key
   * @param {object} data - { ngay_tra_dang_kiem, ghi_chu }
   * @param {string} nguoi_thuc_hien - username
   */
  static async capNhatDangKiem(xe_key, data, nguoi_thuc_hien) {
    const { ngay_tra_giay_dang_kiem, han_dang_kiem, ghi_chu } = data;
    const ngay_tra_dang_kiem = ngay_tra_giay_dang_kiem;

    const result = await query(
      `UPDATE tm_hang_hoa_serial
       SET dang_kiem = TRUE,
           ngay_tra_dang_kiem = COALESCE($2::date, CURRENT_DATE),
           han_dang_kiem = $3::date,
           nguoi_lam_dang_kiem = $4,
           ghi_chu_dich_vu = COALESCE($5, ghi_chu_dich_vu),
           updated_at = CURRENT_TIMESTAMP
       WHERE ma_serial = $1 AND trang_thai = 'DA_BAN'
       RETURNING *`,
      [
        xe_key,
        ngay_tra_dang_kiem || null,
        han_dang_kiem || null,
        nguoi_thuc_hien,
        ghi_chu,
      ],
    );

    if (result.rows.length === 0) {
      throw { status: 404, message: "Xe không tồn tại hoặc chưa được bán" };
    }

    // Khống cần tự động tạo nhắc nhở đăng kiểm cho xe máy
    return result.rows[0];
  }

  /**
   * Lấy thống kê nhanh cho dashboard
   * Đếm số xe DA_BAN còn chưa hoàn thành đăng ký / đăng kiểm
   */
  static async getStats() {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE trang_thai = 'DA_BAN' AND so_hoa_don_ban IS NOT NULL) AS tong_cong,
        COUNT(*) FILTER (WHERE trang_thai = 'DA_BAN' AND so_hoa_don_ban IS NOT NULL AND dang_ky_xe = FALSE) AS cho_dang_ky,
        COUNT(*) FILTER (WHERE trang_thai = 'DA_BAN' AND so_hoa_don_ban IS NOT NULL AND dang_kiem = FALSE) AS cho_dang_kiem,
        COUNT(*) FILTER (WHERE trang_thai = 'DA_BAN' AND so_hoa_don_ban IS NOT NULL AND dang_ky_xe = TRUE AND dang_kiem = TRUE) AS da_hoan_thanh
      FROM tm_hang_hoa_serial
    `);
    return result.rows[0];
  }
}

module.exports = DichVuSauBanService;
