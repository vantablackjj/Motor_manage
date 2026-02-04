// services/warehouse.service.js
// ERP-aligned generic warehouse management service
// Handles both SERIAL (units) and BATCH (lo) goods

const { query, pool } = require("../config/database");

class WarehouseService {
  /**
   * Unified logic for recording goods entry (Import)
   * Handles both Serial-tracked items (Vehicles) and Batch-tracked items (Parts)
   */
  static async processEntry(
    client,
    {
      ma_hang_hoa,
      loai_quan_ly,
      ma_kho,
      so_luong,
      don_gia,
      so_chung_tu,
      loai_giao_dich,
      serials = [], // Array of { serial, identifier, attributes } for SERIAL items
      nguoi_thuc_hien,
      ghi_chu,
    },
  ) {
    if (loai_quan_ly === "SERIAL") {
      // Process Serial Items
      for (const s of serials) {
        // Upsert Serial record
        await client.query(
          `
          INSERT INTO tm_hang_hoa_serial (
            ma_serial, ma_hang_hoa, serial_identifier, ma_kho_hien_tai, 
            trang_thai, gia_von, thuoc_tinh_rieng, ngay_nhap_kho, ghi_chu
          ) VALUES ($1, $2, $3, $4, 'TON_KHO', $5, $6, CURRENT_TIMESTAMP, $7)
          ON CONFLICT (ma_serial) DO UPDATE SET
            ma_kho_hien_tai = $4,
            trang_thai = 'TON_KHO',
            gia_von = $5,
            thuoc_tinh_rieng = $6,
            updated_at = CURRENT_TIMESTAMP
        `,
          [
            s.serial || s.ma_serial,
            ma_hang_hoa,
            s.identifier || s.serial_identifier,
            ma_kho,
            don_gia,
            JSON.stringify(s.attributes || s.thuoc_tinh_rieng || {}),
            ghi_chu,
          ],
        );

        // Record history for this serial
        await this.recordHistory(client, {
          ma_hang_hoa,
          ma_serial: s.serial || s.ma_serial,
          loai_giao_dich,
          so_chung_tu,
          ma_kho_nhap: ma_kho,
          so_luong: 1,
          don_gia,
          nguoi_thuc_hien,
          dien_giai: ghi_chu || `Nhập kho theo chứng từ ${so_chung_tu}`,
        });
      }
    } else {
      // Process Batch Items
      await client.query(
        `
        INSERT INTO tm_hang_hoa_ton_kho (ma_hang_hoa, ma_kho, so_luong_ton, gia_von_binh_quan, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (ma_hang_hoa, ma_kho) DO UPDATE SET
          so_luong_ton = tm_hang_hoa_ton_kho.so_luong_ton + $3,
          updated_at = CURRENT_TIMESTAMP
      `,
        [ma_hang_hoa, ma_kho, so_luong, don_gia],
      );

      // Record history for batch
      await this.recordHistory(client, {
        ma_hang_hoa,
        loai_giao_dich,
        so_chung_tu,
        ma_kho_nhap: ma_kho,
        so_luong,
        don_gia,
        nguoi_thuc_hien,
        dien_giai: ghi_chu || `Nhập phụ tùng theo chứng từ ${so_chung_tu}`,
      });
    }
  }

  /**
   * Unified logic for recording goods exit (Export)
   */
  static async processExit(
    client,
    {
      ma_hang_hoa,
      loai_quan_ly,
      ma_kho,
      so_luong,
      don_gia,
      so_chung_tu,
      loai_giao_dich,
      serials = [], // ma_serial strings
      nguoi_thuc_hien,
      ghi_chu,
    },
  ) {
    if (loai_quan_ly === "SERIAL") {
      for (const ma_serial of serials) {
        const result = await client.query(
          `
          UPDATE tm_hang_hoa_serial
          SET trang_thai = $1::enum_trang_thai_serial, 
              ma_kho_hien_tai = CASE WHEN $1::text = 'DA_BAN' THEN NULL ELSE ma_kho_hien_tai END,
              updated_at = CURRENT_TIMESTAMP
          WHERE ma_serial = $2 AND ma_kho_hien_tai = $3
          RETURNING *
        `,
          [
            loai_giao_dich === "BAN_HANG" ? "DA_BAN" : "XUAT_KHO",
            ma_serial,
            ma_kho,
          ],
        );

        if (result.rowCount === 0) {
          throw new Error(
            `Serial ${ma_serial} không có trong kho ${ma_kho} hoặc trạng thái không hợp lệ`,
          );
        }

        await this.recordHistory(client, {
          ma_hang_hoa,
          ma_serial,
          loai_giao_dich,
          so_chung_tu,
          ma_kho_xuat: ma_kho,
          so_luong: -1,
          don_gia,
          nguoi_thuc_hien,
          dien_giai: ghi_chu,
        });
      }
    } else {
      const result = await client.query(
        `
        UPDATE tm_hang_hoa_ton_kho
        SET so_luong_ton = so_luong_ton - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE ma_hang_hoa = $2 AND ma_kho = $3 AND so_luong_ton >= $1
        RETURNING *
      `,
        [so_luong, ma_hang_hoa, ma_kho],
      );

      if (result.rowCount === 0) {
        throw new Error(
          `Hàng hóa ${ma_hang_hoa} không đủ tồn kho tại ${ma_kho}`,
        );
      }

      await this.recordHistory(client, {
        ma_hang_hoa,
        loai_giao_dich,
        so_chung_tu,
        ma_kho_xuat: ma_kho,
        so_luong: -so_luong,
        don_gia,
        nguoi_thuc_hien,
        dien_giai: ghi_chu,
      });
    }
  }

  /**
   * Helper to record history in tm_hang_hoa_lich_su
   */
  static async recordHistory(client, data) {
    const {
      ma_hang_hoa,
      ma_serial,
      loai_giao_dich,
      so_chung_tu,
      ma_kho_xuat,
      ma_kho_nhap,
      so_luong,
      don_gia,
      nguoi_thuc_hien,
      dien_giai,
    } = data;

    await client.query(
      `
      INSERT INTO tm_hang_hoa_lich_su (
        ma_hang_hoa, ma_serial, loai_giao_dich, so_chung_tu,
        ma_kho_xuat, ma_kho_nhap, so_luong, don_gia, 
        thanh_tien, nguoi_thuc_hien, dien_giai
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
      [
        ma_hang_hoa,
        ma_serial || null,
        loai_giao_dich,
        so_chung_tu,
        ma_kho_xuat || null,
        ma_kho_nhap || null,
        so_luong,
        don_gia,
        so_luong * don_gia,
        nguoi_thuc_hien,
        dien_giai,
      ],
    );
  }
}

module.exports = WarehouseService;
