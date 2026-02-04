/**
 * Kho (Warehouse) Repository
 */

const BaseRepository = require("./BaseRepository");

class KhoRepository extends BaseRepository {
  constructor() {
    super("sys_kho");
  }

  async findByMaKho(maKho, client = null) {
    return this.findByField("ma_kho", maKho, client);
  }

  async findKhoChinh(client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} WHERE chinh = TRUE AND status = TRUE`,
    );
    return result.rows;
  }

  async findKhoDaily(client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} WHERE daily = TRUE AND status = TRUE`,
    );
    return result.rows;
  }

  async findChildren(maKhoCha, client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} 
             WHERE ma_kho_cha = $1 AND status = TRUE
             ORDER BY ten_kho`,
      [maKhoCha],
    );
    return result.rows;
  }
}

module.exports = new KhoRepository();
