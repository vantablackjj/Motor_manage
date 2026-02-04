/**
 * TonKho (Inventory) Repository
 * Handles both Serial and Batch inventory
 */

const BaseRepository = require("./BaseRepository");

class TonKhoRepository extends BaseRepository {
  constructor() {
    super("tm_hang_hoa_ton_kho");
  }

  /**
   * Get inventory for a product in a warehouse
   */
  async findByHangHoaAndKho(maHangHoa, maKho, client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} 
             WHERE ma_hang_hoa = $1 AND ma_kho = $2`,
      [maHangHoa, maKho],
    );
    return result.rows[0];
  }

  /**
   * Get available quantity (not locked)
   */
  async getAvailableQuantity(maHangHoa, maKho, client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT (so_luong_ton - so_luong_khoa) as kha_dung
             FROM ${this.tableName}
             WHERE ma_hang_hoa = $1 AND ma_kho = $2`,
      [maHangHoa, maKho],
    );
    return result.rows[0]?.kha_dung || 0;
  }

  /**
   * Lock inventory (for pending orders)
   */
  async lockInventory(maHangHoa, maKho, soLuong, client) {
    if (!client) throw new Error("Client required for lock operation");

    // Check available quantity
    const available = await this.getAvailableQuantity(maHangHoa, maKho, client);
    if (available < soLuong) {
      throw new Error(
        `Insufficient inventory. Available: ${available}, Required: ${soLuong}`,
      );
    }

    // Update locked quantity
    await client.query(
      `UPDATE ${this.tableName}
             SET so_luong_khoa = so_luong_khoa + $1
             WHERE ma_hang_hoa = $2 AND ma_kho = $3`,
      [soLuong, maHangHoa, maKho],
    );
  }

  /**
   * Unlock inventory
   */
  async unlockInventory(maHangHoa, maKho, soLuong, client) {
    if (!client) throw new Error("Client required for unlock operation");

    await client.query(
      `UPDATE ${this.tableName}
             SET so_luong_khoa = so_luong_khoa - $1
             WHERE ma_hang_hoa = $2 AND ma_kho = $3`,
      [soLuong, maHangHoa, maKho],
    );
  }

  /**
   * Update inventory (increase/decrease)
   */
  async updateInventory(maHangHoa, maKho, soLuong, donGia, client) {
    if (!client) throw new Error("Client required for inventory update");

    // Get current inventory
    const current = await this.findByHangHoaAndKho(maHangHoa, maKho, client);

    if (!current) {
      // Create new inventory record
      await client.query(
        `INSERT INTO ${this.tableName} 
                 (ma_hang_hoa, ma_kho, so_luong_ton, gia_von_binh_quan)
                 VALUES ($1, $2, $3, $4)`,
        [maHangHoa, maKho, soLuong, donGia],
      );
    } else {
      // Calculate weighted average cost
      const totalValue =
        current.so_luong_ton * current.gia_von_binh_quan + soLuong * donGia;
      const totalQty = current.so_luong_ton + soLuong;
      const newAvgCost = totalQty > 0 ? totalValue / totalQty : 0;

      await client.query(
        `UPDATE ${this.tableName}
                 SET so_luong_ton = so_luong_ton + $1,
                     gia_von_binh_quan = $2,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE ma_hang_hoa = $3 AND ma_kho = $4`,
        [soLuong, newAvgCost, maHangHoa, maKho],
      );
    }
  }

  /**
   * Get low stock items
   */
  async findLowStock(maKho = null, client = null) {
    const db = client || require("../config/database").pool;
    let sql = `
            SELECT t.*, h.ten_hang_hoa
            FROM ${this.tableName} t
            INNER JOIN tm_hang_hoa h ON t.ma_hang_hoa = h.ma_hang_hoa
            WHERE (t.so_luong_ton - t.so_luong_khoa) <= t.so_luong_toi_thieu
        `;
    const params = [];

    if (maKho) {
      sql += " AND t.ma_kho = $1";
      params.push(maKho);
    }

    sql += " ORDER BY t.ma_kho, h.ten_hang_hoa";

    const result = await db.query(sql, params);
    return result.rows;
  }
}

module.exports = new TonKhoRepository();
