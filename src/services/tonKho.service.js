const { query } = require("../config/database");

class InventoryService {
  // Lấy tất cả tồn kho
  static async getAll(filters = {}) {
    let sql = `
      SELECT id, ma_kho, ma_hang_hoa as ma_pt, so_luong_ton, updated_at as updated_at
      FROM tm_hang_hoa_ton_kho
      WHERE 1 = 1
    `;

    const params = [];

    if (filters.ma_kho) {
      sql += ` AND ma_kho = $${params.length + 1}`;
      params.push(filters.ma_kho);
    }

    if (filters.ma_pt) {
      sql += ` AND ma_hang_hoa = $${params.length + 1}`;
      params.push(filters.ma_pt);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  // Ma KHo
  static async getByID(ma_kho) {
    const sql = `
      SELECT id, ma_kho, ma_hang_hoa as ma_pt, so_luong_ton, updated_at as updated_at
      FROM tm_hang_hoa_ton_kho
      WHERE ma_kho = $1
    `;
    const result = await query(sql, [ma_kho]);
    return result.rows;
  }

  // Ma PT
  static async getByPT(ma_pt) {
    const sql = `
      SELECT id, ma_kho, ma_hang_hoa as ma_pt, so_luong_ton, updated_at as updated_at
      FROM tm_hang_hoa_ton_kho
      WHERE ma_hang_hoa = $1
    `;
    const result = await query(sql, [ma_pt]);
    return result.rows;
  }

  // Tạo tồn kho ban đầu
  static async createInitial({ ma_kho, ma_pt, so_luong_ton }) {
    const sql = `
      INSERT INTO tm_hang_hoa_ton_kho (ma_kho, ma_hang_hoa, so_luong_ton)
      VALUES ($1, $2, $3)
      ON CONFLICT (ma_hang_hoa, ma_kho)
      DO UPDATE SET so_luong_ton = EXCLUDED.so_luong_ton, updated_at = NOW()
      RETURNING *;
    `;
    const result = await query(sql, [ma_kho, ma_pt, so_luong_ton]);
    return result.rows[0];
  }

  // Tăng số lượng (nhập kho)
  static async increaseStock(ma_kho, ma_pt, qty) {
    const sql = `
      UPDATE tm_hang_hoa_ton_kho
      SET so_luong_ton = so_luong_ton + $3, updated_at = NOW()
      WHERE ma_kho = $1 AND ma_hang_hoa = $2
      RETURNING *;
    `;
    const result = await query(sql, [ma_kho, ma_pt, qty]);
    return result.rows[0];
  }

  // Giảm số lượng (xuất kho)
  static async decreaseStock(ma_kho, ma_pt, qty) {
    const checkSql = `
      SELECT so_luong_ton FROM tm_hang_hoa_ton_kho 
      WHERE ma_kho = $1 AND ma_hang_hoa = $2
    `;
    const check = await query(checkSql, [ma_kho, ma_pt]);

    if (check.rowCount === 0) {
      throw new Error("Không tìm thấy tồn kho");
    }

    if (check.rows[0].so_luong_ton < qty) {
      throw new Error("Số lượng tồn không đủ");
    }

    const sql = `
      UPDATE tm_hang_hoa_ton_kho
      SET so_luong_ton = so_luong_ton - $3, updated_at = NOW()
      WHERE ma_kho = $1 AND ma_hang_hoa = $2
      RETURNING *;
    `;

    const result = await query(sql, [ma_kho, ma_pt, qty]);
    return result.rows[0];
  }

  // Chuyển kho
  static async transfer(fromKho, toKho, ma_pt, qty) {
    // Giảm kho nguồn
    await InventoryService.decreaseStock(fromKho, ma_pt, qty);

    // Tăng kho đích
    const sqlInsert = `
      INSERT INTO tm_hang_hoa_ton_kho (ma_kho, ma_hang_hoa, so_luong_ton)
      VALUES ($1, $2, 0)
      ON CONFLICT (ma_hang_hoa, ma_kho) DO NOTHING;
    `;
    await query(sqlInsert, [toKho, ma_pt]);

    return await InventoryService.increaseStock(toKho, ma_pt, qty);
  }
}

module.exports = InventoryService;
