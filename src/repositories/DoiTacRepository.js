/**
 * DoiTac (Partner) Repository
 */

const BaseRepository = require("./BaseRepository");

class DoiTacRepository extends BaseRepository {
  constructor() {
    super("dm_doi_tac");
  }

  async findByMaDoiTac(maDoiTac, client = null) {
    return this.findByField("ma_doi_tac", maDoiTac, client);
  }

  async findByLoai(loaiDoiTac, client = null) {
    const db = client || require("../config/database").pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} 
             WHERE loai_doi_tac = $1 AND status = TRUE
             ORDER BY ten_doi_tac`,
      [loaiDoiTac],
    );
    return result.rows;
  }

  async search(searchTerm, filters = {}, client = null) {
    const db = client || require("../config/database").pool;
    let sql = `
            SELECT * FROM ${this.tableName}
            WHERE status = TRUE
            AND (ten_doi_tac ILIKE $1 OR ma_doi_tac ILIKE $1 OR dien_thoai ILIKE $1)
        `;
    const params = [`%${searchTerm}%`];
    let paramIndex = 2;

    if (filters.loai_doi_tac) {
      sql += ` AND loai_doi_tac = $${paramIndex}`;
      params.push(filters.loai_doi_tac);
      paramIndex++;
    }

    sql += " ORDER BY ten_doi_tac";
    const result = await db.query(sql, params);
    return result.rows;
  }
}

module.exports = new DoiTacRepository();
