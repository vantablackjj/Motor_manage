// services/model.service.js
const { query } = require('../config/database');

class ModelService {
  // ======================
  // GET ALL
  // ======================
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        lx.ma_loai,
        lx.ten_loai,

        nh.ma_nh,
        nh.ten_nh,

        nsx.ma,
        nsx.ten_noi_sx,

        lh.ma_lh,
        lh.ten_lh,

        lx.gia_nhap,
        lx.gia_ban,
        lx.gia_thue,
        lx.vat,
        lx.status
      FROM tm_xe_loai lx
      JOIN sys_nhan_hieu nh ON lx.ma_nh = nh.ma_nh
      JOIN sys_noi_sx nsx ON lx.noi_sx = nsx.ma
      JOIN sys_loai_hinh lh ON lx.loai_hinh = lh.ma_lh
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (filters.ma_nh) {
      sql += ` AND lx.ma_nh = $${i++}`;
      params.push(filters.ma_nh);
    }

    if (filters.loai_hinh) {
      sql += ` AND lx.loai_hinh = $${i++}`;
      params.push(filters.loai_hinh);
    }

    if (filters.status !== undefined) {
      sql += ` AND lx.status = $${i++}`;
      params.push(filters.status);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  // ======================
  // GET ONE
  // ======================
  static async getById(ma_loai) {
    const result = await query(
      `SELECT * FROM tm_xe_loai WHERE ma_loai=$1`,
      [ma_loai]
    );
    return result.rows[0];
  }

  // ======================
  // CREATE
  // ======================
  static async create(data) {
    // 1. Check trùng
    const exists = await this.getById(data.ma_loai);
    if (exists) throw new Error('Loại xe đã tồn tại');

    // 2. Validate FK
    await this.validateForeignKeys(data);

    // 3. Insert
    const result = await query(
      `INSERT INTO tm_xe_loai (
        ma_loai, ten_loai,
        ma_nh, noi_sx, loai_hinh,
        gia_nhap, gia_ban, gia_thue, vat, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        data.ma_loai,
        data.ten_loai,
        data.ma_nh,
        data.noi_sx,
        data.loai_hinh,
        data.gia_nhap,
        data.gia_ban,
        data.gia_thue,
        data.vat,
        data.status ?? true,
      ]
    );

    return result.rows[0];
  }

  // ======================
  // UPDATE
  // ======================
  static async update(ma_loai, data) {
    const exists = await this.getById(ma_loai);
    if (!exists) throw new Error('Loại xe không tồn tại');

    await this.validateForeignKeys(data);

    const result = await query(
      `UPDATE tm_xe_loai
       SET ten_loai=$1,
           ma_nh=$2,
           noi_sx=$3,
           loai_hinh=$4,
           gia_nhap=$5,
           gia_ban=$6,
           gia_thue=$7,
           vat=$8,
           status=$9
       WHERE ma_loai=$10
       RETURNING *`,
      [
        data.ten_loai,
        data.ma_nh,
        data.noi_sx,
        data.loai_hinh,
        data.gia_nhap,
        data.gia_ban,
        data.gia_thue,
        data.vat,
        data.status,
        ma_loai,
      ]
    );

    return result.rows[0];
  }

  // ======================
  // VALIDATE FK
  // ======================
  static async validateForeignKeys(data) {
    const checks = [
      {
        table: 'sys_nhan_hieu',
        column: 'ma_nh',
        value: data.ma_nh,
        msg: 'Nhãn hiệu không tồn tại',
      },
      {
        table: 'sys_noi_sx',
        column: 'ma',
        value: data.noi_sx,
        msg: 'Nơi sản xuất không tồn tại',
      },
      {
        table: 'sys_loai_hinh',
        column: 'ma_lh',
        value: data.loai_hinh,
        msg: 'Loại hình xe không tồn tại',
      },
    ];

    for (const c of checks) {
      const r = await query(
        `SELECT 1 FROM ${c.table} WHERE ${c.column}=$1 AND status=true`,
        [c.value]
      );
      if (!r.rows.length) throw new Error(c.msg);
    }
  }
  static async delete(ma_loai) {
    // Có thể soft delete nếu muốn
    const result = await query(
      `DELETE FROM sys_loai_xe WHERE ma_loai=$1 RETURNING *`,
      [ma_loai]
    );
    return result.rows[0];
  }
}

module.exports = ModelService;
