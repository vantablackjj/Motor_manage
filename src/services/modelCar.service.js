// services/model.service.js
const { query } = require("../config/database");

class ModelService {
  // ======================
  // GET ALL
  // ======================
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        hh.ma_hang_hoa as ma_loai,
        hh.ten_hang_hoa as ten_loai,
        hh.ma_nhom_hang as ma_nh,
        nh.ten_nhom as ten_nh,
        hh.thong_so_ky_thuat->>'noi_sx' as ten_noi_sx,
        hh.thong_so_ky_thuat->>'loai_hinh' as ten_lh,
        hh.gia_von_mac_dinh as gia_nhap,
        hh.gia_ban_mac_dinh as gia_ban,
        COALESCE((hh.thong_so_ky_thuat->>'gia_thue')::decimal, 0) as gia_thue,
        COALESCE((hh.thong_so_ky_thuat->>'vat')::decimal, 0) as vat,
        hh.status
      FROM tm_hang_hoa hh
      LEFT JOIN dm_nhom_hang nh ON hh.ma_nhom_hang = nh.ma_nhom
      WHERE hh.loai_quan_ly = 'SERIAL'
    `;

    const params = [];
    let i = 1;

    if (filters.ma_nh) {
      sql += ` AND hh.ma_nhom_hang = $${i++}`;
      params.push(filters.ma_nh);
    }

    if (filters.loai_hinh) {
      sql += ` AND hh.thong_so_ky_thuat->>'loai_hinh' = $${i++}`;
      params.push(filters.loai_hinh);
    }

    if (filters.status !== undefined) {
      sql += ` AND hh.status = $${i++}`;
      params.push(filters.status);
    }

    sql += ` ORDER BY hh.ma_nhom_hang, hh.ten_hang_hoa`;

    const result = await query(sql, params);
    return result.rows;
  }

  // ======================
  // GET ONE
  // ======================
  static async getById(ma_loai) {
    const result = await query(
      `SELECT 
        ma_hang_hoa as ma_loai, 
        ten_hang_hoa as ten_loai,
        ma_nhom_hang as ma_nh,
        gia_von_mac_dinh as gia_nhap,
        gia_ban_mac_dinh as gia_ban,
        thong_so_ky_thuat,
        status
       FROM tm_hang_hoa 
       WHERE ma_hang_hoa = $1 AND loai_quan_ly = 'SERIAL'`,
      [ma_loai],
    );
    if (result.rows[0]) {
      // Flatten thong_so_ky_thuat into top level for backward compatibility if needed
      const item = result.rows[0];
      const specs = item.thong_so_ky_thuat || {};
      return {
        ...item,
        noi_sx: specs.noi_sx,
        loai_hinh: specs.loai_hinh,
        gia_thue: specs.gia_thue,
        vat: specs.vat,
        phan_khoi: specs.phan_khoi,
      };
    }
    return null;
  }

  // ======================
  // CREATE
  // ======================
  static async create(data) {
    // Re-use logic from ProductCatalogService or implement locally
    const exists = await this.getById(data.ma_loai);
    if (exists) throw new Error("Loại xe đã tồn tại");

    const thong_so_ky_thuat = {
      noi_sx: data.noi_sx,
      loai_hinh: data.loai_hinh,
      gia_thue: data.gia_thue || 0,
      vat: data.vat || 0,
      phan_khoi: data.phan_khoi,
    };

    const result = await query(
      `INSERT INTO tm_hang_hoa (
        ma_hang_hoa, ten_hang_hoa,
        ma_nhom_hang, loai_quan_ly,
        gia_von_mac_dinh, gia_ban_mac_dinh,
        thong_so_ky_thuat, status
      )
      VALUES ($1, $2, $3, 'SERIAL', $4, $5, $6, $7)
      RETURNING *`,
      [
        data.ma_loai,
        data.ten_loai,
        data.ma_nh,
        data.gia_nhap || 0,
        data.gia_ban || 0,
        JSON.stringify(thong_so_ky_thuat),
        data.status ?? true,
      ],
    );

    return result.rows[0];
  }

  // ======================
  // UPDATE
  // ======================
  static async update(ma_loai, data) {
    const exists = await this.getById(ma_loai);
    if (!exists) throw new Error("Loại xe không tồn tại");

    const currentSpecs = exists.thong_so_ky_thuat || {};
    const thong_so_ky_thuat = {
      ...currentSpecs,
      noi_sx: data.noi_sx !== undefined ? data.noi_sx : currentSpecs.noi_sx,
      loai_hinh:
        data.loai_hinh !== undefined ? data.loai_hinh : currentSpecs.loai_hinh,
      gia_thue:
        data.gia_thue !== undefined ? data.gia_thue : currentSpecs.gia_thue,
      vat: data.vat !== undefined ? data.vat : currentSpecs.vat,
      phan_khoi:
        data.phan_khoi !== undefined ? data.phan_khoi : currentSpecs.phan_khoi,
    };

    const result = await query(
      `UPDATE tm_hang_hoa
       SET ten_hang_hoa = COALESCE($1, ten_hang_hoa),
           ma_nhom_hang = COALESCE($2, ma_nhom_hang),
           gia_von_mac_dinh = COALESCE($3, gia_von_mac_dinh),
           gia_ban_mac_dinh = COALESCE($4, gia_ban_mac_dinh),
           thong_so_ky_thuat = $5,
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE ma_hang_hoa = $7 AND loai_quan_ly = 'SERIAL'
       RETURNING *`,
      [
        data.ten_loai,
        data.ma_nh,
        data.gia_nhap,
        data.gia_ban,
        JSON.stringify(thong_so_ky_thuat),
        data.status,
        ma_loai,
      ],
    );

    return result.rows[0];
  }

  static async delete(ma_loai) {
    const result = await query(
      `UPDATE tm_hang_hoa SET status = false WHERE ma_hang_hoa = $1 AND loai_quan_ly = 'SERIAL' RETURNING *`,
      [ma_loai],
    );
    return result.rows[0];
  }
}

module.exports = ModelService;
