const { query } = require("../config/database");
const { pool } = require("../config/database");

class PhuTung {
  // Lấy tất cả phụ tùng
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        pt.id, pt.ma_hang_hoa as ma_pt, pt.ten_hang_hoa as ten_pt, pt.don_vi_tinh, pt.ma_nhom_hang as nhom_pt,
        pt.gia_von_mac_dinh as gia_nhap, pt.gia_ban_mac_dinh as gia_ban, 0 as vat, pt.status, pt.mo_ta as ghi_chu,
        pt.created_at
      FROM tm_hang_hoa pt
      WHERE pt.status = TRUE
    `;

    const params = [];

    if (filters.nhom_pt) {
      params.push(filters.nhom_pt);
      sql += ` AND pt.ma_nhom_hang = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (pt.ten_hang_hoa ILIKE $${params.length} OR pt.ma_hang_hoa ILIKE $${params.length})`;
    }

    sql += " ORDER BY pt.ma_nhom_hang, pt.ten_hang_hoa";

    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy tồn kho phụ tùng theo kho
  static async getTonKho(ma_kho, filters = {}) {
    let sql = `
      SELECT 
        pt.ma_hang_hoa as ma_pt, pt.ten_hang_hoa as ten_pt, pt.don_vi_tinh, pt.ma_nhom_hang as nhom_pt,
        tk.so_luong_ton, tk.so_luong_khoa, (tk.so_luong_ton - tk.so_luong_khoa) as so_luong_kha_dung,
        tk.so_luong_toi_thieu, pt.gia_von_mac_dinh as gia_nhap, pt.gia_ban_mac_dinh as gia_ban,
        (tk.so_luong_ton * pt.gia_von_mac_dinh) as gia_tri_ton_kho,
        CASE 
          WHEN (tk.so_luong_ton - tk.so_luong_khoa) <= 0 THEN 'HET_HANG'
          WHEN (tk.so_luong_ton - tk.so_luong_khoa) <= tk.so_luong_toi_thieu THEN 'CANH_BAO'
          ELSE 'BINH_THUONG'
        END as trang_thai_ton
      FROM tm_hang_hoa_ton_kho tk
      INNER JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa
      WHERE tk.ma_kho = $1 AND pt.status = TRUE
    `;

    const params = [ma_kho];

    sql += " ORDER BY pt.ma_nhom_hang, pt.ten_hang_hoa";

    const result = await query(sql, params);

    // Filter by trang_thai_ton if needed
    if (filters.trang_thai_ton) {
      return result.rows.filter(
        (row) => row.trang_thai_ton === filters.trang_thai_ton,
      );
    }

    return result.rows;
  }

  //Chỉnh sửa phụ tùng
  static async update(ma_pt, data) {
    const { ten_pt, don_vi_tinh, nhom_pt, gia_nhap, gia_ban, vat, ghi_chu } =
      data;

    const result = await query(
      `UPDATE tm_hang_hoa 
       SET ten_hang_hoa = $1, don_vi_tinh = $2, ma_nhom_hang = $3,
           gia_von_mac_dinh = $4, gia_ban_mac_dinh = $5, mo_ta = $6
       WHERE ma_hang_hoa = $7 AND status = TRUE
       RETURNING *`,
      [ten_pt, don_vi_tinh, nhom_pt, gia_nhap, gia_ban, ghi_chu, ma_pt],
    );
    return result.rows[0];
  }
  // Tạo phụ tùng mới
  static async create(data) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        ma_pt,
        ten_pt,
        don_vi_tinh,
        nhom_pt,
        gia_nhap,
        gia_ban,
        vat,
        ghi_chu,
      } = data;

      const result = await client.query(
        `INSERT INTO tm_hang_hoa (
        ma_hang_hoa, ten_hang_hoa, don_vi_tinh, ma_nhom_hang,
        gia_von_mac_dinh, gia_ban_mac_dinh, mo_ta, loai_quan_ly
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,'BATCH')
      RETURNING *`,
        [ma_pt, ten_pt, don_vi_tinh, nhom_pt, gia_nhap, gia_ban, ghi_chu],
      );

      // Ghi lịch sử hàng hóa
      await client.query(
        `INSERT INTO tm_hang_hoa_lich_su(
      ma_hang_hoa, loai_giao_dich, so_chung_tu, ngay_giao_dich,
      so_luong, don_gia, thanh_tien,
      nguoi_thuc_hien, dien_giai
  )
  VALUES ($1,'THEM_MOI',$2,NOW(),0,$3,0,$4,$5)`,
        [
          ma_pt,
          "NK-" + ma_pt,
          gia_nhap,
          data.nguoi_thuc_hien || "System",
          "Thêm mới phụ tùng",
        ],
      );

      await client.query(
        `INSERT INTO tm_hang_hoa_ton_kho (
          ma_hang_hoa,
          ma_kho,
          so_luong_ton,
          so_luong_khoa,
          so_luong_toi_thieu
      )
      SELECT $1, k.ma_kho, 0, 0, 0
      FROM sys_kho k`,
        [ma_pt],
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

  // Khóa phụ tùng
  static async lock(
    clientOrMaPt,
    ma_ptOrMaKho,
    ma_khoOrMaPhieu,
    ma_phieuOrLoaiPhieu,
    loai_phieuOrSoLuong,
    so_luongOrLyDo,
    ly_do = null,
  ) {
    let client, ma_pt, ma_kho, ma_phieu, loai_phieu, so_luong;
    let externalClient = false;

    if (clientOrMaPt && clientOrMaPt.query) {
      client = clientOrMaPt;
      ma_pt = ma_ptOrMaKho;
      ma_kho = ma_khoOrMaPhieu;
      ma_phieu = ma_phieuOrLoaiPhieu;
      loai_phieu = loai_phieuOrSoLuong;
      so_luong = so_luongOrLyDo;
      externalClient = true;
    } else {
      client = await pool.connect();
      ma_pt = clientOrMaPt;
      ma_kho = ma_ptOrMaKho;
      ma_phieu = ma_khoOrMaPhieu;
      loai_phieu = ma_phieuOrLoaiPhieu;
      so_luong = loai_phieuOrSoLuong;
      ly_do = so_luongOrLyDo;
    }

    try {
      if (!externalClient) await client.query("BEGIN");

      // 1. Khóa dòng tồn kho vật lý
      const tonKhoRes = await client.query(
        `
      SELECT so_luong_ton, so_luong_khoa
      FROM tm_hang_hoa_ton_kho
      WHERE ma_hang_hoa = $1 AND ma_kho = $2
      FOR UPDATE
      `,
        [ma_pt, ma_kho],
      );

      if (tonKhoRes.rowCount === 0) {
        throw new Error(`Phụ tùng ${ma_pt} chưa tồn tại trong kho ${ma_kho}`);
      }

      const { so_luong_ton, so_luong_khoa } = tonKhoRes.rows[0];
      const kha_dung = so_luong_ton - so_luong_khoa;

      if (kha_dung < so_luong) {
        throw new Error(
          `Tồn kho không đủ. Khả dụng: ${kha_dung}, yêu cầu: ${so_luong}`,
        );
      }

      // 2. Insert khóa tồn
      await client.query(
        `
      INSERT INTO tm_hang_hoa_khoa (
        ma_hang_hoa, ma_kho, so_phieu, loai_phieu, so_luong_khoa, ly_do
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [ma_pt, ma_kho, ma_phieu, loai_phieu, so_luong, ly_do],
      );

      // 3. Update tổng khóa
      await client.query(
        `
      UPDATE tm_hang_hoa_ton_kho
      SET so_luong_khoa = so_luong_khoa + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE ma_hang_hoa = $2 AND ma_kho = $3
      `,
        [so_luong, ma_pt, ma_kho],
      );

      if (!externalClient) await client.query("COMMIT");
      return true;
    } catch (error) {
      if (!externalClient) await client.query("ROLLBACK");
      throw error;
    } finally {
      if (!externalClient) client.release();
    }
  }

  static async unlock(
    clientOrMaPhieu,
    ma_phieu = null,
    ma_kho = null,
    so_phieu = null,
  ) {
    let client;
    let externalClient = false;

    if (clientOrMaPhieu && clientOrMaPhieu.query) {
      client = clientOrMaPhieu;
      externalClient = true;
    } else {
      client = await pool.connect();
      ma_phieu = clientOrMaPhieu;
    }

    try {
      if (!externalClient) await client.query("BEGIN");

      const khoaRes = await client.query(
        `
      SELECT ma_hang_hoa, ma_kho, so_luong_khoa
      FROM tm_hang_hoa_khoa
      WHERE so_phieu = $1
      FOR UPDATE
      `,
        [ma_phieu],
      );

      for (const k of khoaRes.rows) {
        await client.query(
          `
        UPDATE tm_hang_hoa_ton_kho
        SET so_luong_khoa = so_luong_khoa - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE ma_hang_hoa = $2 AND ma_kho = $3
        `,
          [k.so_luong_khoa, k.ma_hang_hoa, k.ma_kho],
        );
      }

      await client.query(`DELETE FROM tm_hang_hoa_khoa WHERE so_phieu = $1`, [
        ma_phieu,
      ]);

      if (!externalClient) await client.query("COMMIT");
      return true;
    } catch (error) {
      if (!externalClient) await client.query("ROLLBACK");
      throw error;
    } finally {
      if (!externalClient) client.release();
    }
  }
}

module.exports = PhuTung;
