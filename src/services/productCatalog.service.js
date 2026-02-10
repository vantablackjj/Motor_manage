// services/productCatalog.service.js
// ERP-aligned service for product catalog management
// Replaces: modelCar.service.js, loaiHinh.service.js, noiSx.service.js

const { query, pool } = require("../config/database");

class ProductCatalogService {
  /**
   * Get all products (vehicles or spare parts)
   * @param {Object} filters - Filter options
   * @param {string} filters.loai_quan_ly - 'SERIAL' or 'BATCH'
   * @param {string} filters.ma_nhom_hang - Product group code (brand)
   * @param {string} filters.loai_hinh - Vehicle type (from JSONB)
   * @param {boolean} filters.status - Active status
   */
  static async getAll(filters = {}) {
    let sql = `
      SELECT 
        hh.id,
        hh.ma_hang_hoa as ma_loai,
        hh.ten_hang_hoa as ten_loai,
        hh.ma_nhom_hang as ma_nh,
        nh.ten_nhom as ten_nh,
        hh.thong_so_ky_thuat->>'noi_sx' as ten_noi_sx,
        hh.thong_so_ky_thuat->>'loai_hinh' as ten_lh,
        hh.thong_so_ky_thuat->>'phan_khoi' as phan_khoi,
        hh.gia_von_mac_dinh as gia_nhap,
        hh.gia_ban_mac_dinh as gia_ban,
        COALESCE((hh.thong_so_ky_thuat->>'gia_thue')::decimal, 0) as gia_thue,
        COALESCE((hh.thong_so_ky_thuat->>'vat')::decimal, 0) as vat,
        hh.don_vi_tinh,
        hh.loai_quan_ly,
        hh.status,
        fn_get_group_path_text(hh.ma_nhom_hang) as hierarchy_path
      FROM tm_hang_hoa hh
      LEFT JOIN dm_nhom_hang nh ON hh.ma_nhom_hang = nh.ma_nhom
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    // Filter by product type (SERIAL for vehicles, BATCH for parts)
    if (filters.loai_quan_ly) {
      sql += ` AND hh.loai_quan_ly = $${idx++}`;
      params.push(filters.loai_quan_ly);
    }

    // Filter by brand (hierarchical - includes all children)
    if (filters.ma_nh) {
      sql += ` AND hh.ma_nhom_hang IN (
        SELECT group_code FROM fn_get_all_child_groups($${idx++})
      )`;
      params.push(filters.ma_nh);
    }

    // Filter by vehicle type (JSONB query)
    if (filters.loai_hinh) {
      sql += ` AND hh.thong_so_ky_thuat->>'loai_hinh' = $${idx++}`;
      params.push(filters.loai_hinh);
    }

    // Filter by origin (JSONB query)
    if (filters.noi_sx) {
      sql += ` AND hh.thong_so_ky_thuat->>'noi_sx' = $${idx++}`;
      params.push(filters.noi_sx);
    }

    // Filter by status (Default = TRUE if not specified, 'all' = no filter)
    if (filters.status !== undefined) {
      if (String(filters.status) === "all") {
        // Return ALL (active + deleted)
      } else {
        sql += ` AND hh.status = $${idx++}`;
        params.push(filters.status === "true" || filters.status === true);
      }
    } else {
      // Default: Only Active
      sql += ` AND hh.status = TRUE`;
    }

    sql += ` ORDER BY hh.ma_nhom_hang, hh.ten_hang_hoa`;

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get product by code
   */
  static async getById(ma_loai) {
    const result = await query(
      `SELECT 
        hh.id,
        hh.ma_hang_hoa as ma_loai,
        hh.ten_hang_hoa as ten_loai,
        hh.ma_nhom_hang as ma_nh,
        nh.ten_nhom as ten_nh,
        nh.thong_so_bat_buoc as nh_thong_so,
        hh.gia_von_mac_dinh as gia_nhap,
        hh.gia_ban_mac_dinh as gia_ban,
        hh.don_vi_tinh,
        hh.loai_quan_ly,
        hh.thong_so_ky_thuat,
        hh.mo_ta,
        hh.status,
        fn_get_group_path_text(hh.ma_nhom_hang) as hierarchy_path
      FROM tm_hang_hoa hh
      LEFT JOIN dm_nhom_hang nh ON hh.ma_nhom_hang = nh.ma_nhom
      WHERE hh.ma_hang_hoa = $1`,
      [ma_loai],
    );
    return result.rows[0];
  }

  /**
   * Create new product
   */
  static async create(data) {
    const { generateCode } = require("../ultils/codeGenerator");
    // 1. Validate brand and get required specs
    const brandResult = await query(
      `SELECT ten_nhom, thong_so_bat_buoc, status FROM dm_nhom_hang WHERE ma_nhom = $1`,
      [data.ma_nh],
    );

    if (brandResult.rows.length === 0) {
      throw new Error(`Nhóm hàng '${data.ma_nh}' không tồn tại`);
    }

    if (!brandResult.rows[0].status) {
      throw new Error(`Nhóm hàng '${data.ma_nh}' đã bị xóa hoặc bị khóa`);
    }

    const { thong_so_bat_buoc } = brandResult.rows[0];

    // 2. Generate code
    const ma_loai = await generateCode("tm_hang_hoa", "ma_hang_hoa", "SP");

    // 3. Build & Validate JSONB specs based on brand config
    const thong_so_ky_thuat = { ...data.thong_so_ky_thuat };

    // Auto-fill common fields for backward compatibility
    if (data.phan_khoi) thong_so_ky_thuat.phan_khoi = data.phan_khoi;
    if (data.noi_sx) thong_so_ky_thuat.noi_sx = data.noi_sx;
    if (data.loai_hinh) thong_so_ky_thuat.loai_hinh = data.loai_hinh;

    // Unit conversion fields (Quy đổi đơn vị)
    if (data.don_vi_lon) thong_so_ky_thuat.don_vi_lon = data.don_vi_lon; // VD: Thùng, Cuộn
    if (data.ty_le_quy_doi)
      thong_so_ky_thuat.ty_le_quy_doi = Number(data.ty_le_quy_doi); // VD: 20

    // Validate mandatory fields from dm_nhom_hang
    if (thong_so_bat_buoc) {
      for (const [key, required] of Object.entries(thong_so_bat_buoc)) {
        if (
          required &&
          !thong_so_ky_thuat[key] &&
          thong_so_ky_thuat[key] !== 0
        ) {
          throw new Error(
            `Thuộc tính '${key}' là bắt buộc đối với nhóm hàng này`,
          );
        }
      }
    }

    const result = await query(
      `INSERT INTO tm_hang_hoa (
        ma_hang_hoa, ten_hang_hoa, ma_nhom_hang, loai_quan_ly,
        gia_von_mac_dinh, gia_ban_mac_dinh, don_vi_tinh,
        thong_so_ky_thuat, mo_ta, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        ma_loai,
        data.ten_loai,
        data.ma_nh,
        data.loai_quan_ly || (data.ma_nh === "XE" ? "SERIAL" : "BATCH"),
        data.gia_nhap || 0,
        data.gia_ban || 0,
        data.don_vi_tinh || (data.ma_nh === "XE" ? "Chiếc" : "Cái"),
        JSON.stringify(thong_so_ky_thuat),
        data.mo_ta || null,
        data.status ?? true,
      ],
    );

    return result.rows[0];
  }

  /**
   * Update product
   */
  static async update(ma_loai, data) {
    const exists = await this.getById(ma_loai);
    if (!exists) {
      throw new Error("Sản phẩm không tồn tại");
    }

    // Validate brand if changed
    if (data.ma_nh) {
      const brandExists = await query(
        `SELECT 1 FROM dm_nhom_hang WHERE ma_nhom = $1 AND status = true`,
        [data.ma_nh],
      );
      if (brandExists.rows.length === 0) {
        throw new Error(`Nhãn hiệu '${data.ma_nh}' không tồn tại`);
      }
    }

    // Build updated JSONB specs
    const currentSpecs = exists.thong_so_ky_thuat || {};
    const thong_so_ky_thuat = {
      ...currentSpecs,
      phan_khoi:
        data.phan_khoi !== undefined ? data.phan_khoi : currentSpecs.phan_khoi,
      noi_sx: data.noi_sx || currentSpecs.noi_sx,
      loai_hinh: data.loai_hinh || currentSpecs.loai_hinh,
      gia_thue:
        data.gia_thue !== undefined ? data.gia_thue : currentSpecs.gia_thue,
      vat: data.vat !== undefined ? data.vat : currentSpecs.vat,
      don_vi_lon: data.don_vi_lon || currentSpecs.don_vi_lon,
      ty_le_quy_doi:
        data.ty_le_quy_doi !== undefined
          ? Number(data.ty_le_quy_doi)
          : currentSpecs.ty_le_quy_doi,
    };

    const result = await query(
      `UPDATE tm_hang_hoa
       SET ten_hang_hoa = COALESCE($1, ten_hang_hoa),
           ma_nhom_hang = COALESCE($2, ma_nhom_hang),
           gia_von_mac_dinh = COALESCE($3, gia_von_mac_dinh),
           gia_ban_mac_dinh = COALESCE($4, gia_ban_mac_dinh),
           don_vi_tinh = COALESCE($5, don_vi_tinh),
           thong_so_ky_thuat = $6,
           mo_ta = COALESCE($7, mo_ta),
           status = COALESCE($8, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE ma_hang_hoa = $9
       RETURNING *`,
      [
        data.ten_loai,
        data.ma_nh,
        data.gia_nhap,
        data.gia_ban,
        data.don_vi_tinh,
        JSON.stringify(thong_so_ky_thuat),
        data.mo_ta,
        data.status,
        ma_loai,
      ],
    );

    return result.rows[0];
  }

  /**
   * Soft delete product
   */
  static async delete(ma_loai) {
    // Check if product has instances
    const hasInstances = await query(
      `SELECT COUNT(*) as count FROM tm_hang_hoa_serial WHERE ma_hang_hoa = $1`,
      [ma_loai],
    );

    if (hasInstances.rows[0].count > 0) {
      throw new Error("Không thể xóa sản phẩm đã có xe/hàng hóa trong kho");
    }

    const result = await query(
      `UPDATE tm_hang_hoa
       SET status = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE ma_hang_hoa = $1
       RETURNING *`,
      [ma_loai],
    );

    if (result.rows.length === 0) {
      throw new Error("Sản phẩm không tồn tại");
    }

    return result.rows[0];
  }

  /**
   * Get distinct values for filters (from JSONB)
   */
  static async getDistinctValues(field) {
    const result = await query(
      `SELECT DISTINCT 
        thong_so_ky_thuat->>'${field}' as value
       FROM tm_hang_hoa
       WHERE thong_so_ky_thuat ? '${field}'
         AND thong_so_ky_thuat->>'${field}' IS NOT NULL
         AND status = TRUE
       ORDER BY value`,
    );
    return result.rows.map((r) => r.value);
  }

  /**
   * Get vehicle types (loai_hinh) from JSONB
   */
  static async getVehicleTypes() {
    return this.getDistinctValues("loai_hinh");
  }

  /**
   * Get origins (noi_sx) from JSONB
   */
  static async getOrigins() {
    return this.getDistinctValues("noi_sx");
  }

  /**
   * Get products by brand (hierarchical)
   */
  static async getByBrand(ma_nh) {
    const result = await query(
      `SELECT 
        hh.ma_hang_hoa as ma_loai,
        hh.ten_hang_hoa as ten_loai,
        hh.gia_von_mac_dinh as gia_nhap,
        hh.gia_ban_mac_dinh as gia_ban,
        hh.thong_so_ky_thuat,
        hh.status
       FROM tm_hang_hoa hh
       WHERE hh.ma_nhom_hang IN (
         SELECT group_code FROM fn_get_all_child_groups($1)
       )
       AND hh.status = TRUE
       ORDER BY hh.ten_hang_hoa`,
      [ma_nh],
    );
    return result.rows;
  }

  /**
   * Get stock overview for a product across all warehouses
   * Unifies SERIAL and BATCH stock tracking
   */
  static async getStockOverview(ma_hang_hoa) {
    const product = await this.getById(ma_hang_hoa);
    if (!product) throw new Error("Hàng hóa không tồn tại");

    let stockData;
    if (product.loai_quan_ly === "SERIAL") {
      // Count serials per warehouse
      stockData = await query(
        `SELECT 
          k.ma_kho,
          k.ten_kho,
          COUNT(s.ma_serial) as so_luong_ton,
          0 as so_luong_khoa,
          jsonb_agg(jsonb_build_object(
            'ma_serial', s.ma_serial,
            'identifier', s.serial_identifier,
            'trang_thai', s.trang_thai,
            'thuoc_tinh', s.thuoc_tinh_rieng
          )) as chi_tiet_serial
        FROM sys_kho k
        LEFT JOIN tm_hang_hoa_serial s ON k.ma_kho = s.ma_kho_hien_tai AND s.ma_hang_hoa = $1
        WHERE s.trang_thai = 'TON_KHO'
        GROUP BY k.ma_kho, k.ten_kho`,
        [ma_hang_hoa],
      );
    } else {
      // Sum batch stock per warehouse
      stockData = await query(
        `SELECT 
          k.ma_kho,
          k.ten_kho,
          COALESCE(t.so_luong_ton, 0) as so_luong_ton,
          COALESCE(t.so_luong_khoa, 0) as so_luong_khoa,
          NULL as chi_tiet_serial
        FROM sys_kho k
        LEFT JOIN tm_hang_hoa_ton_kho t ON k.ma_kho = t.ma_kho AND t.ma_hang_hoa = $1
        WHERE t.so_luong_ton > 0`,
        [ma_hang_hoa],
      );
    }

    return {
      ma_hang_hoa: product.ma_loai,
      ten_hang_hoa: product.ten_loai,
      loai_quan_ly: product.loai_quan_ly,
      don_vi_tinh: product.don_vi_tinh,
      inventory: stockData.rows,
    };
  }
}

module.exports = ProductCatalogService;
