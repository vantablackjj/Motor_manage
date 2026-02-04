/**
 * Base Repository Pattern
 * Provides common database operations
 */

const { pool } = require("../config/database");
const logger = require("../ultils/logger");

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Find record by ID
   */
  async findById(id, client = null) {
    const db = client || pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * Find record by unique field
   */
  async findByField(field, value, client = null) {
    const db = client || pool;
    const result = await db.query(
      `SELECT * FROM ${this.tableName} WHERE ${field} = $1`,
      [value],
    );
    return result.rows[0] || null;
  }

  /**
   * Find all with filters and pagination
   */
  async findAll(filters = {}, pagination = {}, client = null) {
    const db = client || pool;
    const { page = 1, pageSize = 20, sort = "id", order = "ASC" } = pagination;
    const offset = (page - 1) * pageSize;

    let sql = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        sql += ` AND ${key} = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    // Apply sorting
    sql += ` ORDER BY ${sort} ${order}`;

    // Apply pagination
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const result = await db.query(sql, params);

    // Get total count
    const countSql =
      `SELECT COUNT(*) FROM ${this.tableName} WHERE 1=1` +
      sql.substring(sql.indexOf("WHERE") + 5, sql.indexOf("ORDER BY"));
    const countResult = await db.query(countSql, params.slice(0, -2));

    return {
      data: result.rows,
      pagination: {
        page,
        pageSize,
        totalItems: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / pageSize),
      },
    };
  }

  /**
   * Create new record
   */
  async create(data, client = null) {
    const db = client || pool;
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
            INSERT INTO ${this.tableName} (${fields.join(", ")})
            VALUES (${placeholders})
            RETURNING *
        `;

    const result = await db.query(sql, values);
    return result.rows[0];
  }

  /**
   * Update record
   */
  async update(id, data, client = null) {
    const db = client || pool;
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields
      .map((field, i) => `${field} = $${i + 1}`)
      .join(", ");

    const sql = `
            UPDATE ${this.tableName}
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${fields.length + 1}
            RETURNING *
        `;

    const result = await db.query(sql, [...values, id]);
    return result.rows[0];
  }

  /**
   * Soft delete (set status = FALSE)
   */
  async softDelete(id, client = null) {
    const db = client || pool;
    const result = await db.query(
      `UPDATE ${this.tableName} SET status = FALSE WHERE id = $1 RETURNING *`,
      [id],
    );
    return result.rows[0];
  }

  /**
   * Hard delete
   */
  async delete(id, client = null) {
    const db = client || pool;
    const result = await db.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
      [id],
    );
    return result.rows[0];
  }

  /**
   * Check if record exists
   */
  async exists(field, value, client = null) {
    const db = client || pool;
    const result = await db.query(
      `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE ${field} = $1)`,
      [value],
    );
    return result.rows[0].exists;
  }

  /**
   * Execute custom query
   */
  async query(sql, params = [], client = null) {
    const db = client || pool;
    try {
      const result = await db.query(sql, params);
      return result.rows;
    } catch (error) {
      logger.error(`Query error in ${this.tableName}:`, error);
      throw error;
    }
  }
}

module.exports = BaseRepository;
