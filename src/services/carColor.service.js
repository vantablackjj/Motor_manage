const { query } = require('../config/database');

class CarColorService {

  // ======================
  // LẤY MÀU THEO LOẠI XE
  // ======================
  static async getColorsByModel(ma_loai_xe,ma_mau) {
    const result = await query(
      `
   SELECT 
  xm.ma_loai_xe,
  xm.ma_mau,
  m.ten_mau
FROM tm_xe_mau xm
JOIN sys_mau m 
  ON xm.ma_mau = m.ma_mau
JOIN tm_xe_loai xl 
  ON xl.ma_loai = xm.ma_loai_xe
WHERE xm.ma_loai_xe = $1
  OR xm.ma_mau = $2
  AND xm.status = true;

      `,
      [ma_loai_xe,ma_mau]
    );

    return result.rows;
  }

  // ======================
  // GÁN MÀU CHO LOẠI XE
  // ======================
  static async assignColor(data) {
    // 1. Validate FK
    await this.validateForeignKeys(data);

    // 2. Check trùng
    const exists = await query(
      `
      SELECT 1 FROM tm_xe_mau
      WHERE ma_loai_xe=$1 AND ma_mau=$2
      `,
      [data.ma_loai_xe, data.ma_mau]
    );

    if (exists.rows.length) {
      throw new Error('Màu đã được gán cho loại xe này');
    }

    // 3. Insert
    const result = await query(
      `
      INSERT INTO tm_xe_mau (ma_loai_xe, ma_mau, status)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [
        data.ma_loai_xe,
        data.ma_mau,
        data.status ?? true,
      ]
    );

    return result.rows[0];
  }

  // ======================
  // GỠ MÀU (SOFT DELETE)
  // ======================
  static async removeColor(ma_loai_xe, ma_mau) {
    const result = await query(
      `
      UPDATE tm_xe_mau
      SET status=false
      WHERE ma_loai_xe=$1 AND ma_mau=$2
      RETURNING *
      `,
      [ma_loai_xe, ma_mau]
    );

    if (!result.rows.length) {
      throw new Error('Không tìm thấy mapping màu xe');
    }

    return result.rows[0];
  }

  // ======================
  // VALIDATE FK
  // ======================
  static async validateForeignKeys(data) {
    const checks = [
      {
        table: 'tm_xe_loai',
        column: 'ma_loai',
        value: data.ma_loai_xe,
        msg: 'Loại xe không tồn tại',
      },
      {
        table: 'sys_mau',
        column: 'ma_mau',
        value: data.ma_mau,
        msg: 'Màu xe không tồn tại',
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
}

module.exports = CarColorService;
