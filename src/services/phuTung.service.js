const { query } = require('../config/database');
const {pool} = require('../config/database');

class PhuTung {
  // Lấy tất cả phụ tùng
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        pt.id, pt.ma_pt, pt.ten_pt, pt.don_vi_tinh, pt.nhom_pt,
        pt.gia_nhap, pt.gia_ban, pt.vat, pt.status, pt.ghi_chu,
        pt.ngay_tao
      FROM tm_phu_tung pt
      WHERE pt.status = TRUE
    `;
    
    const params = [];
    
    if (filters.nhom_pt) {
      params.push(filters.nhom_pt);
      sql += ` AND pt.nhom_pt = $${params.length}`;
    }
    
    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (pt.ten_pt ILIKE $${params.length} OR pt.ma_pt ILIKE $${params.length})`;
    }
    
    sql += ' ORDER BY pt.nhom_pt, pt.ten_pt';
    
    const result = await query(sql, params);
    return result.rows;
  }

  // Lấy tồn kho phụ tùng theo kho
  static async getTonKho(ma_kho, filters = {}) {
    let sql = `
      SELECT 
        pt.ma_pt, pt.ten_pt, pt.don_vi_tinh, pt.nhom_pt,
        tk.so_luong_ton, tk.so_luong_khoa, tk.so_luong_kha_dung,
        tk.so_luong_toi_thieu, pt.gia_nhap, pt.gia_ban,
        (tk.so_luong_ton * pt.gia_nhap) as gia_tri_ton_kho,
        CASE 
          WHEN tk.so_luong_kha_dung <= 0 THEN 'HET_HANG'
          WHEN tk.so_luong_kha_dung <= tk.so_luong_toi_thieu THEN 'CANH_BAO'
          ELSE 'BINH_THUONG'
        END as trang_thai_ton
      FROM tm_phu_tung_ton_kho tk
      INNER JOIN tm_phu_tung pt ON tk.ma_pt = pt.ma_pt
      WHERE tk.ma_kho = $1 AND pt.status = TRUE
    `;
    
    const params = [ma_kho];
    
    if (filters.trang_thai_ton) {
      // Will be added in HAVING clause
    }
    
    sql += ' ORDER BY pt.nhom_pt, pt.ten_pt';
    
    const result = await query(sql, params);
    
    // Filter by trang_thai_ton if needed
    if (filters.trang_thai_ton) {
      return result.rows.filter(row => row.trang_thai_ton === filters.trang_thai_ton);
    }
    
    return result.rows;
  }

  //Chỉnh sửa phụ tùng
  static async update(ma_pt, data) {
    const { ten_pt, don_vi_tinh, nhom_pt, gia_nhap, gia_ban, vat, ghi_chu } = data;
  
    const result = await query(
      `UPDATE tm_phu_tung 
       SET ten_pt = $1, don_vi_tinh = $2, nhom_pt = $3,
           gia_nhap = $4, gia_ban = $5, vat = $6, ghi_chu = $7
       WHERE ma_pt = $8 AND status = TRUE
       RETURNING *`,
      [ten_pt, don_vi_tinh, nhom_pt, gia_nhap, gia_ban, vat, ghi_chu, ma_pt]
    );
    return result.rows[0];
  }
  // Tạo phụ tùng mới
 static async create(data) {
  const { pool } = require('../config/database');
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { ma_pt, ten_pt, don_vi_tinh, nhom_pt, gia_nhap, gia_ban, vat, ghi_chu } = data;

    const result = await client.query(
      `INSERT INTO tm_phu_tung (
        ma_pt, ten_pt, don_vi_tinh, nhom_pt,
        gia_nhap, gia_ban, vat, ghi_chu
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [ma_pt, ten_pt, don_vi_tinh, nhom_pt, gia_nhap, gia_ban, vat, ghi_chu]
    );
   await client.query(
  `INSERT INTO tm_phu_tung_lich_su(
      ma_pt, loai_giao_dich, so_chung_tu, ngay_giao_dich,
      ma_kho_xuat, ma_kho_nhap, so_luong, don_gia, thanh_tien,
      nguoi_thuc_hien, dien_giai
  )
  VALUES ($1,'THEM_MOI',$2,NOW(),$3,$4,0,$5,0,$6,$7)`,
  [
    ma_pt,
    "NK-" + ma_pt,
    ma_kho_hien_tai,
    null,
    gia_nhap,
    req.user.username,
    "Nhập xe từ nhà cung cấp"
  ]
)

    // KHÔNG insert so_luong_kha_dung
    await client.query(
      `INSERT INTO tm_phu_tung_ton_kho (
          ma_pt,
          ma_kho,
          so_luong_ton,
          so_luong_khoa,
          so_luong_toi_thieu
      )
      SELECT $1, k.ma_kho, 0, 0, 0
      FROM sys_kho k`,
      [ma_pt]
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
  static async lock(ma_pt, ma_kho, ma_phieu, loai_phieu, so_luong, ly_do) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Khóa dòng tồn kho vật lý
    const tonKhoRes = await client.query(
      `
      SELECT so_luong_ton, so_luong_khoa
      FROM tm_phu_tung_ton_kho
      WHERE ma_pt = $1 AND ma_kho = $2
      FOR UPDATE
      `,
      [ma_pt, ma_kho]
    );

    if (tonKhoRes.rowCount === 0) {
      throw new Error(`Phụ tùng ${ma_pt} chưa tồn tại trong kho ${ma_kho}`);
    }

    const { so_luong_ton, so_luong_khoa } = tonKhoRes.rows[0];
    const kha_dung = so_luong_ton - so_luong_khoa;

    if (kha_dung < so_luong) {
      throw new Error(
        `Tồn kho không đủ. Khả dụng: ${kha_dung}, yêu cầu: ${so_luong}`
      );
    }

    // 2. Insert khóa tồn
    await client.query(
      `
      INSERT INTO tm_phu_tung_khoa (
        ma_pt, ma_kho, so_phieu, loai_phieu, so_luong_khoa, ly_do
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [ma_pt, ma_kho, ma_phieu, loai_phieu, so_luong, ly_do]
    );

    // 3. Update tổng khóa
    await client.query(
      `
      UPDATE tm_phu_tung_ton_kho
      SET so_luong_khoa = so_luong_khoa + $1,
          ngay_cap_nhat = CURRENT_TIMESTAMP
      WHERE ma_pt = $2 AND ma_kho = $3
      `,
      [so_luong, ma_pt, ma_kho]
    );

    await client.query('COMMIT');
    return true;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
static async unlock(ma_phieu) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const khoaRes = await client.query(
      `
      SELECT ma_pt, ma_kho, so_luong_khoa
      FROM tm_phu_tung_khoa
      WHERE so_phieu = $1
      FOR UPDATE
      `,
      [ma_phieu]
    );

    for (const k of khoaRes.rows) {
      await client.query(
        `
        UPDATE tm_phu_tung_ton_kho
        SET so_luong_khoa = so_luong_khoa - $1,
            ngay_cap_nhat = CURRENT_TIMESTAMP
        WHERE ma_pt = $2 AND ma_kho = $3
        `,
        [k.so_luong_khoa, k.ma_pt, k.ma_kho]
      );
    }

    await client.query(
      `DELETE FROM tm_phu_tung_khoa WHERE so_phieu = $1`,
      [ma_phieu]
    );

    await client.query('COMMIT');
    return true;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

}

module.exports = PhuTung;
