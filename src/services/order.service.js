// services/order.service.js
// Unified Order & Invoice Management Service
// PO + SO + Stock Transfer -> tm_don_hang

const { query, pool } = require("../config/database");
const WarehouseService = require("./warehouse.service");
const CongNoService = require("./congNo.service");
const ThuChiService = require("./thuChi.service");
const NotificationService = require("./notification.service");
const Xe = require("./xe.service");

class OrderService {
  /**
   * Helper: Generate Order Number
   */
  static async _generateOrderNo(client, type) {
    const prefix =
      type === "MUA_HANG" ? "PO" : type === "BAN_HANG" ? "SO" : "TO";
    const { rows } = await client.query(`
      SELECT '${prefix}' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_po')::text, 6, '0') as order_no
    `);
    return rows[0].order_no;
  }

  /**
   * Helper: Check and validate stock for sales/transfer orders
   */
  static async _checkStock(client, loai_don_hang, ma_ben_xuat, loai_ben_xuat, items) {
    if (!["BAN_HANG", "CHUYEN_KHO", "BAN_XE"].includes(loai_don_hang)) return;
    if (loai_ben_xuat !== "KHO") return;

    for (const item of items) {
      const { ma_hang_hoa, so_luong_dat } = item;

      // Check if it's a serial or model
      const serialRes = await client.query(
        "SELECT ma_hang_hoa, trang_thai, locked FROM tm_hang_hoa_serial WHERE ma_serial = $1",
        [ma_hang_hoa],
      );

      if (serialRes.rowCount > 0) {
        // It's a specific vehicle serial
        const serial = serialRes.rows[0];
        if (serial.trang_thai !== "TON_KHO" || serial.locked) {
          throw new Error(
            `Kế hoạch bán xe ${ma_hang_hoa} thất bại: Xe không có trong kho hoặc đang bị khóa (Trạng thái: ${serial.trang_thai})`,
          );
        }
      } else {
        // It's a model or spare part
        const tonKhoRes = await client.query(
          "SELECT so_luong_ton, so_luong_khoa FROM tm_hang_hoa_ton_kho WHERE ma_hang_hoa = $1 AND ma_kho = $2",
          [ma_hang_hoa, ma_ben_xuat],
        );

        const stock = tonKhoRes.rows[0];
        const available = stock ? Number(stock.so_luong_ton) - Number(stock.so_luong_khoa) : 0;

        if (available < so_luong_dat) {
          throw new Error(
            `Mã hàng ${ma_hang_hoa} không đủ tồn kho tại ${ma_ben_xuat}. Hiện khả dụng: ${available}, yêu cầu: ${so_luong_dat}`,
          );
        }
      }
    }
  }

  /**
   * Create a new order (PO, SO, or Transfer)
   */
  static async createOrder(data) {
    const {
      loai_don_hang,
      ma_ben_xuat,
      loai_ben_xuat,
      ma_ben_nhap,
      loai_ben_nhap,
      items = [], // Array of { ma_hang_hoa, so_luong_dat, don_gia, yeu_cau_dac_biet }
      nguoi_tao,
      ghi_chu,
    } = data;

    // Fallback for date field
    const ngay_dat_hang = data.ngay_dat_hang || data.ngay_lap || new Date();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const so_don_hang = await this._generateOrderNo(client, loai_don_hang);

      // Verify stock for Sales/Transfer
      await this._checkStock(client, loai_don_hang, ma_ben_xuat, loai_ben_xuat, items);

      // Calculate totals
      const tong_gia_tri = items.reduce(
        (sum, item) => sum + item.so_luong_dat * item.don_gia,
        0,
      );

      // Insert Header
      const { rows: orderRows } = await client.query(
        `
        INSERT INTO tm_don_hang (
          so_don_hang, loai_don_hang, ngay_dat_hang,
          ma_ben_xuat, loai_ben_xuat, ma_ben_nhap, loai_ben_nhap,
          tong_gia_tri, chiet_khau, vat_percentage, thanh_tien,
          trang_thai, nguoi_tao, created_by, ghi_chu
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'NHAP', $12, $13, $14)
        RETURNING *
      `,
        [
          so_don_hang,
          loai_don_hang,
          ngay_dat_hang,
          ma_ben_xuat,
          loai_ben_xuat,
          ma_ben_nhap,
          loai_ben_nhap,
          tong_gia_tri,
          data.chiet_khau || 0,
          data.vat_percentage || 0,
          tong_gia_tri -
            (data.chiet_khau || 0) +
            (tong_gia_tri * (data.vat_percentage || 0)) / 100,
          data.nguoi_tao,
          data.created_by,
          ghi_chu,
        ],
      );

      // Insert Details
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let final_ma_hang_hoa = item.ma_hang_hoa;
        let final_yeu_cau_dac_biet = item.yeu_cau_dac_biet || {};

        // Auto-resolve serial if provided as ma_hang_hoa for Vehicles
        if (
          item.loai_hang === "XE" ||
          (final_ma_hang_hoa && final_ma_hang_hoa.startsWith("XE"))
        ) {
          const serialCheck = await client.query(
            "SELECT ma_hang_hoa FROM tm_hang_hoa_serial WHERE ma_serial = $1",
            [final_ma_hang_hoa],
          );
          if (serialCheck.rowCount > 0) {
            final_ma_hang_hoa = serialCheck.rows[0].ma_hang_hoa;
            if (!final_yeu_cau_dac_biet.ma_serial) {
              final_yeu_cau_dac_biet.ma_serial = item.ma_hang_hoa;
            }
            
            // Lock if it's a sales or transfer order
            if (["BAN_HANG", "BAN_XE", "CHUYEN_KHO"].includes(loai_don_hang)) {
              await Xe.lock(
                final_yeu_cau_dac_biet.ma_serial,
                so_don_hang,
                `Đã gán vào đơn hàng ${so_don_hang}`,
                client
              );
            }
          }
        }

        await client.query(
          `
          INSERT INTO tm_don_hang_chi_tiet (
            so_don_hang, stt, ma_hang_hoa, so_luong_dat, don_gia, yeu_cau_dac_biet
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [
            so_don_hang,
            i + 1,
            final_ma_hang_hoa,
            item.so_luong_dat,
            item.don_gia,
            JSON.stringify(final_yeu_cau_dac_biet),
          ],
        );
      }

      await client.query("COMMIT");
      const order = orderRows[0];

      // Fetch creator name for notification
      const userRes = await client.query(
        "SELECT ho_ten FROM sys_user WHERE id = $1",
        [data.created_by],
      );
      const ten_nguoi_tao = userRes.rows[0]?.ho_ten || nguoi_tao;

      // Notify about new order
      let title = "Đơn hàng mới";
      if (order.loai_don_hang === "MUA_HANG") title = "Đơn mua hàng mới";
      if (order.loai_don_hang === "BAN_HANG") title = "Đơn bán hàng mới";

      const targetWarehouse = order.loai_don_hang === "MUA_HANG" ? order.ma_ben_nhap : order.ma_ben_xuat;

      NotificationService.notifyManagers(
        title,
        `Đơn hàng ${so_don_hang} đã được tạo bởi ${ten_nguoi_tao}.`,
        `/orders/view/${so_don_hang}`,
        "SYSTEM",
        targetWarehouse
      ).catch((err) => console.error("Notification Error:", err));

      return order;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Add item to existing order (Only in NHAP status)
   */
  static async addItemToOrder(so_don_hang, itemData) {
    const {
      ma_hang_hoa,
      so_luong_dat,
      don_gia,
      loai_hang, // This was added in the instruction, but not used in the provided snippet. Keeping it for consistency.
      yeu_cau_dac_biet,
    } = itemData;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Get order and verify
      const orderResult = await client.query(
        `SELECT * FROM tm_don_hang WHERE so_don_hang = $1::text OR (CASE WHEN $1::text ~ '^\\d+$' THEN id = $1::text::int ELSE FALSE END) FOR UPDATE`,
        [so_don_hang],
      );
      const order = orderResult.rows[0];

      // STRICT CHECK: Only allow adding items in NHAP status
      if (!order) throw new Error("Đơn hàng không tồn tại");
      if (order.trang_thai !== "NHAP") {
        throw new Error(
          `Không thể thêm sản phẩm vào đơn hàng ở trạng thái ${order.trang_thai}. Chỉ được phép thêm sản phẩm khi đơn hàng ở trạng thái Nháp (NHAP).`,
        );
      }

      // Verify stock for Sales/Transfer
      await this._checkStock(
        client,
        order.loai_don_hang,
        order.ma_ben_xuat,
        order.loai_ben_xuat,
        [{ ma_hang_hoa, so_luong_dat }],
      );

      // 2. Get next STT
      const sttRes = await client.query(
        "SELECT COALESCE(MAX(stt), 0) + 1 as next_stt FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1",
        [order.so_don_hang],
      );
      const nextStt = sttRes.rows[0].next_stt;

      // 3. Resolve ma_hang_hoa if it's a vehicle serial
      let final_ma_hang_hoa = ma_hang_hoa;
      let final_yeu_cau_dac_biet = yeu_cau_dac_biet || {};

      if (loai_hang === "XE" || (ma_hang_hoa && ma_hang_hoa.startsWith("XE"))) {
        const serialCheck = await client.query(
          "SELECT ma_hang_hoa FROM tm_hang_hoa_serial WHERE ma_serial = $1",
          [ma_hang_hoa],
        );
        if (serialCheck.rowCount > 0) {
          final_ma_hang_hoa = serialCheck.rows[0].ma_hang_hoa;
          if (!final_yeu_cau_dac_biet.ma_serial) {
            final_yeu_cau_dac_biet.ma_serial = ma_hang_hoa;
          }

          // Lock if it's a sales/transfer order
          if (
            ["BAN_HANG", "BAN_XE", "CHUYEN_KHO"].includes(order.loai_don_hang)
          ) {
            await Xe.lock(
              final_yeu_cau_dac_biet.ma_serial,
              order.so_don_hang,
              `Thêm vào đơn hàng ${order.so_don_hang}`,
              client,
            );
          }
        }
      }

      // 4. Insert item
      await client.query(
        `INSERT INTO tm_don_hang_chi_tiet (
          so_don_hang, stt, ma_hang_hoa, so_luong_dat, don_gia, yeu_cau_dac_biet
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.so_don_hang,
          nextStt,
          final_ma_hang_hoa,
          so_luong_dat,
          don_gia,
          JSON.stringify(final_yeu_cau_dac_biet),
        ],
      );

      // 4. Update order total
      await client.query(
        `UPDATE tm_don_hang d
         SET tong_gia_tri = sub.total,
             thanh_tien = sub.total - d.chiet_khau + (sub.total * d.vat_percentage / 100)
         FROM (
           SELECT COALESCE(SUM(so_luong_dat * don_gia), 0) as total
           FROM tm_don_hang_chi_tiet
           WHERE so_don_hang = $1
         ) sub
         WHERE d.so_don_hang = $1`,
        [order.so_don_hang],
      );

      await client.query("COMMIT");
      return { success: true, so_don_hang: order.so_don_hang, stt: nextStt };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Remove item from order (Only in NHAP status)
   */
  static async removeItemFromOrder(so_don_hang, stt) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Get order and verify
      const orderResult = await client.query(
        `SELECT * FROM tm_don_hang WHERE so_don_hang = $1::text OR (CASE WHEN $1::text ~ '^\\d+$' THEN id = $1::text::int ELSE FALSE END)`,
        [so_don_hang],
      );
      const order = orderResult.rows[0];
      if (!order) throw new Error("Đơn hàng không tồn tại");

      // STRICT CHECK: Only allow removing items in NHAP status
      if (order.trang_thai !== "NHAP") {
        throw new Error(
          `Không thể xóa sản phẩm khỏi đơn hàng ở trạng thái ${order.trang_thai}. Chỉ được phép xóa sản phẩm khi đơn hàng ở trạng thái Nháp (NHAP).`,
        );
      }

      // 2. Fetch the item to see if it has a serial to unlock
      const itemToUnlock = await client.query(
        "SELECT yeu_cau_dac_biet FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1 AND stt = $2",
        [order.so_don_hang, stt],
      );

      if (
        itemToUnlock.rowCount > 0 &&
        itemToUnlock.rows[0].yeu_cau_dac_biet &&
        itemToUnlock.rows[0].yeu_cau_dac_biet.ma_serial
      ) {
        await Xe.unlock(itemToUnlock.rows[0].yeu_cau_dac_biet.ma_serial, client);
      }

      // 3. Delete the item
      const deleteRes = await client.query(
        "DELETE FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1 AND stt = $2",
        [order.so_don_hang, stt],
      );

      if (deleteRes.rowCount === 0) {
        throw new Error("Sản phẩm không tồn tại trong đơn hàng");
      }

      // 3. Update order total
      await client.query(
        `UPDATE tm_don_hang d
         SET tong_gia_tri = sub.total,
             thanh_tien = sub.total - d.chiet_khau + (sub.total * d.vat_percentage / 100)
         FROM (
           SELECT COALESCE(SUM(so_luong_dat * don_gia), 0) as total
           FROM tm_don_hang_chi_tiet
           WHERE so_don_hang = $1
         ) sub
         WHERE d.so_don_hang = $1`,
        [order.so_don_hang],
      );

      await client.query("COMMIT");
      return { success: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Process and delivery an order (Partial or Full) -> Creates tm_hoa_don
   */
  static async createInvoiceFromOrder(so_don_hang, deliveryData) {
    const { items = [], nguoi_lap, ghi_chu } = deliveryData;
    // items: Array of { stt_don_hang, ma_hang_hoa, so_luong, serials: [], don_gia }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Get Order Info
      const orderResult = await client.query(
        `SELECT * FROM tm_don_hang 
         WHERE so_don_hang = $1::text 
         OR (CASE WHEN $1::text ~ '^\\d+$' THEN id = $1::text::int ELSE FALSE END)`,
        [so_don_hang],
      );
      const order = orderResult.rows[0];
      if (!order) throw new Error("Đơn hàng không tồn tại");

      // 2. Generate Invoice No
      const { rows } = await client.query(
        `SELECT 'INV' || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(nextval('seq_hd')::text, 6, '0') as inv_no`,
      );
      const so_hoa_don = rows[0].inv_no;

      const tong_tien = items.reduce(
        (sum, item) => sum + item.so_luong * item.don_gia,
        0,
      );

      const vat_percentage = order.vat_percentage || 0;

      // 2.1 Check if partner exists (for Sales orders to DOI_TAC)
      let partnerExists = false;
      if (order.loai_ben_nhap === "DOI_TAC" && order.ma_ben_nhap) {
        const checkPartner = await client.query(
          "SELECT 1 FROM dm_doi_tac WHERE ma_doi_tac = $1",
          [order.ma_ben_nhap]
        );
        partnerExists = checkPartner.rowCount > 0;
      }

      // Proportional discount calculation
      const orderTotal = Number(order.tong_gia_tri) || 1; // Avoid division by zero
      const invDiscount =
        (Number(order.chiet_khau) || 0) * (tong_tien / orderTotal);

      const tien_thue_gtgt = ((tong_tien - invDiscount) * vat_percentage) / 100;
      const inv_thanh_tien = tong_tien - invDiscount + tien_thue_gtgt;

      // 3. Insert Invoice Header
      const loai_hoa_don =
        order.loai_don_hang === "MUA_XE" ? "MUA_HANG" : order.loai_don_hang;

      await client.query(
        `
        INSERT INTO tm_hoa_don (
          so_hoa_don, loai_hoa_don, so_don_hang, ngay_hoa_don,
          ma_ben_xuat, loai_ben_xuat, ma_ben_nhap, loai_ben_nhap,
          tong_tien, chiet_khau, tien_thue_gtgt, thanh_tien, trang_thai, 
          nguoi_lap, ghi_chu
        ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, 'DA_GIAO', $12, $13)
      `,
        [
          so_hoa_don,
          loai_hoa_don,
          order.so_don_hang,
          order.ma_ben_xuat,
          order.loai_ben_xuat,
          order.ma_ben_nhap,
          order.loai_ben_nhap,
          tong_tien,
          invDiscount,
          tien_thue_gtgt,
          inv_thanh_tien,
          nguoi_lap,
          ghi_chu,
        ],
      );

      // 4. Process each item and update inventory
      // 4. Process each item and move inventory FIRST (so serials exist)
      let currentStt = 1;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Get product management type
        const prod = await client.query(
          `SELECT loai_quan_ly FROM tm_hang_hoa WHERE ma_hang_hoa = $1`,
          [item.ma_hang_hoa],
        );
        const loai_quan_ly = prod.rows[0].loai_quan_ly;

        // 5. Inventory Movement Logic (MUST be before Detail Insertion for MUA_HANG)
        const isMua =
          order.loai_don_hang === "MUA_HANG" ||
          order.loai_don_hang === "MUA_XE";
        const isBan =
          order.loai_don_hang === "BAN_HANG" ||
          order.loai_don_hang === "BAN_XE";

        if (isMua) {
          await WarehouseService.processEntry(client, {
            ma_hang_hoa: item.ma_hang_hoa,
            loai_quan_ly,
            ma_kho: order.ma_ben_nhap,
            so_luong: item.so_luong,
            don_gia: item.don_gia,
            so_chung_tu: so_hoa_don,
            loai_giao_dich: "NHAP_MUA",
            serials: item.serials,
            nguoi_thuc_hien: nguoi_lap,
            ghi_chu,
          });
        } else if (isBan) {
          await WarehouseService.processExit(client, {
            ma_hang_hoa: item.ma_hang_hoa,
            loai_quan_ly,
            ma_kho: order.ma_ben_xuat,
            so_luong: item.so_luong,
            don_gia: item.don_gia,
            so_chung_tu: so_hoa_don,
            loai_giao_dich: "BAN_HANG",
            serials: item.serials.map((s) =>
              typeof s === "string" ? s : s.ma_serial || s.serial,
            ),
            nguoi_thuc_hien: nguoi_lap,
            ghi_chu,
          });

          // Automatically create first maintenance reminder (30 days or 1000km)
          // Only if delivered to a Customer (DOI_TAC/DOI_TAC exists), not internal transfer (KHO)
          if (
            partnerExists &&
            loai_quan_ly === "SERIAL" &&
            item.serials &&
            item.serials.length > 0 &&
            order.loai_ben_nhap === "DOI_TAC"
          ) {
            for (const s of item.serials) {
              const ma_serial =
                typeof s === "string" ? s : s.ma_serial || s.serial;
              await client.query(
                `INSERT INTO tm_nhac_nho_bao_duong (ma_serial, ma_khach_hang, loai_nhac_nho, ngay_du_kien, so_km_du_kien, trang_thai) 
                 VALUES ($1, $2, 'BAO_DUONG_DINH_KY', CURRENT_DATE + INTERVAL '30 days', 1000, 'CHUA_XU_LY')`,
                [ma_serial, order.ma_ben_nhap],
              );
            }
          }
        } else if (order.loai_don_hang === "CHUYEN_KHO") {
          await WarehouseService.processExit(client, {
            ma_hang_hoa: item.ma_hang_hoa,
            loai_quan_ly,
            ma_kho: order.ma_ben_xuat,
            so_luong: item.so_luong,
            don_gia: item.don_gia,
            so_chung_tu: so_hoa_don,
            loai_giao_dich: "XUAT_CHUYEN",
            serials: item.serials.map((s) =>
              typeof s === "string" ? s : s.ma_serial || s.serial,
            ),
            nguoi_thuc_hien: nguoi_lap,
            ghi_chu: `Chuyển sang kho ${order.ma_ben_nhap}`,
          });

          await WarehouseService.processEntry(client, {
            ma_hang_hoa: item.ma_hang_hoa,
            loai_quan_ly,
            ma_kho: order.ma_ben_nhap,
            so_luong: item.so_luong,
            don_gia: item.don_gia,
            so_chung_tu: so_hoa_don,
            loai_giao_dich: "NHAP_CHUYEN",
            serials: item.serials,
            nguoi_thuc_hien: nguoi_lap,
            ghi_chu: `Nhận chuyển từ kho ${order.ma_ben_xuat}`,
          });
        }

        // 6. Insert Invoice Detail
        if (loai_quan_ly === "SERIAL") {
          for (const s of item.serials) {
            await client.query(
              `
              INSERT INTO tm_hoa_don_chi_tiet (
                so_hoa_don, stt, ma_hang_hoa, ma_serial, so_luong, don_gia
              ) VALUES ($1, $2, $3, $4, 1, $5)
            `,
              [
                so_hoa_don,
                currentStt++,
                item.ma_hang_hoa,
                s.ma_serial || s.serial || s,
                item.don_gia,
              ],
            );
          }
        } else {
          await client.query(
            `
            INSERT INTO tm_hoa_don_chi_tiet (
              so_hoa_don, stt, ma_hang_hoa, so_luong, don_gia
            ) VALUES ($1, $2, $3, $4, $5)
          `,
            [
              so_hoa_don,
              currentStt++,
              item.ma_hang_hoa,
              item.so_luong,
              item.don_gia,
            ],
          );
        }

        // 7. Update Order Progress - Use ID/STT specifically to avoid duplicate product line issues
        if (item.id || item.stt_don_hang || item.stt) {
          await client.query(
            `
            UPDATE tm_don_hang_chi_tiet
            SET so_luong_da_giao = so_luong_da_giao + $1
            WHERE so_don_hang = $2 AND (id = $3 OR stt = $3)
          `,
            [
              item.so_luong,
              order.so_don_hang,
              item.id || item.stt_don_hang || item.stt,
            ],
          );
        } else {
          // Fallback: update the first incomplete row for this product
          await client.query(
            `
            UPDATE tm_don_hang_chi_tiet
            SET so_luong_da_giao = so_luong_da_giao + $1
            WHERE id = (
              SELECT id FROM tm_don_hang_chi_tiet 
              WHERE so_don_hang = $2 AND ma_hang_hoa = $3 
              AND so_luong_da_giao < so_luong_dat
              ORDER BY stt ASC LIMIT 1
            )
          `,
            [item.so_luong, order.so_don_hang, item.ma_hang_hoa],
          );
        }
      }

      // 7.5 Increment Invoice Count on Order (Safe Update)
      await client.query(
        `UPDATE tm_don_hang 
         SET so_hoa_don_da_xuat = LEAST(so_hoa_don_da_xuat + 1, so_hoa_don_du_kien) 
         WHERE so_don_hang = $1`,
        [order.so_don_hang],
      );

      // 7. RECORD FINANCIALS (DEBT)
      const isMuaFin =
        order.loai_don_hang === "MUA_HANG" || order.loai_don_hang === "MUA_XE";
      const isBanFin =
        order.loai_don_hang === "BAN_HANG" || order.loai_don_hang === "BAN_XE";

      if (isMuaFin && order.loai_ben_xuat === "DOI_TAC" && order.ma_ben_xuat) {
        // Need to check source partner for Purchases
        const checkSrcPartner = await client.query(
          "SELECT 1 FROM dm_doi_tac WHERE ma_doi_tac = $1",
          [order.ma_ben_xuat]
        );
        if (checkSrcPartner.rowCount > 0) {
          await CongNoService.recordDoiTacDebt(client, {
            ma_doi_tac: order.ma_ben_xuat, // NCC
            loai_cong_no: "PHAI_TRA",
            ma_kho: order.ma_ben_nhap, // Kho của mình
            so_hoa_don: so_hoa_don,
            so_tien: inv_thanh_tien,
            ghi_chu: `Nợ mua hàng theo hóa đơn ${so_hoa_don}`,
          });
        }
      } else if (isBanFin && order.loai_ben_nhap === "DOI_TAC" && order.ma_ben_nhap && partnerExists) {
        await CongNoService.recordDoiTacDebt(client, {
          ma_doi_tac: order.ma_ben_nhap, // Khách hàng
          loai_cong_no: "PHAI_THU",
          ma_kho: order.ma_ben_xuat, // Kho của mình
          so_hoa_don: so_hoa_don,
          so_tien: inv_thanh_tien,
          ghi_chu: `Nợ bán hàng theo hóa đơn ${so_hoa_don}`,
        });
      } else if (order.loai_don_hang === "CHUYEN_KHO") {
        await CongNoService.recordInternalDebt(client, {
          ma_kho_no: order.ma_ben_nhap, // Kho nhận
          ma_kho_co: order.ma_ben_xuat, // Kho xuất
          so_phieu_chuyen_kho: order.so_don_hang,
          so_tien: tong_tien, // Giá trị chuyển kho (thường là giá vốn)
          ghi_chu: `Nợ nội bộ chuyển kho ${order.so_don_hang}`,
        });
      }

      // 8. Update Order Header Status if all items delivered
      const remainingResult = await client.query(
        `
        SELECT SUM(so_luong_dat - so_luong_da_giao) as total_remaining FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1
      `,
        [order.so_don_hang],
      );

      if (parseInt(remainingResult.rows[0].total_remaining) === 0) {
        await client.query(
          `UPDATE tm_don_hang SET trang_thai = 'HOAN_THANH'::enum_trang_thai_don_hang WHERE so_don_hang = $1`,
          [order.so_don_hang],
        );
      } else {
        await client.query(
          `UPDATE tm_don_hang SET trang_thai = 'DANG_GIAO'::enum_trang_thai_don_hang WHERE so_don_hang = $1`,
          [order.so_don_hang],
        );
      }

      // 8. Auto Payment Logic (Cash Flow Integration)
      if (
        order.loai_don_hang === "MUA_HANG" &&
        deliveryData.payment_info &&
        deliveryData.payment_info.should_pay
      ) {
        const { amount, method, fund_id } = deliveryData.payment_info;

        if (amount > 0) {
          // Create Payment Voucher (Phiếu Chi)
          const phieuChi = await ThuChiService.taoPhieu(
            {
              nguoi_tao: nguoi_lap,
              ngay_giao_dich: new Date(),
              ma_kho: order.ma_ben_nhap, // Kho nhập trả tiền
              ma_kh: order.ma_ben_xuat, // Nhà cung cấp nhận tiền
              so_tien: amount,
              loai: "CHI",
              hinh_thuc: method || "TIEN_MAT",
              dien_giai: `Thanh toán nhập hàng theo hóa đơn ${so_hoa_don}`,
              ma_hoa_don: so_hoa_don,
            },
            client,
          );

          // Approve immediately to update fund balance
          await ThuChiService.pheDuyet(phieuChi.so_phieu_tc, nguoi_lap, client);

          // Update Invoice Status if fully paid
          if (amount >= tong_tien) {
            await client.query(
              `UPDATE tm_hoa_don SET trang_thai = 'DA_THANH_TOAN' WHERE so_hoa_don = $1`,
              [so_hoa_don],
            );
          }
        }
      }

      await client.query("COMMIT");
      return { so_hoa_don };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get list of orders with pagination and filters
   */
  static async getOrders(filters = {}) {
    const {
      loai_don_hang,
      ma_ben_xuat,
      ma_ben_nhap,
      ma_kho, // Added for isolation
      trang_thai,
      page = 1,
      limit = 20,
    } = filters;
    const conditions = [];
    const values = [];
    let idx = 1;

    // Validate loai_don_hang enum value
    const validOrderTypes = ["MUA_HANG", "BAN_HANG", "CHUYEN_KHO", "MUA_XE", "BAN_XE"];
    if (loai_don_hang) {
      if (!validOrderTypes.includes(loai_don_hang)) {
        throw new Error(
          `Invalid loai_don_hang value: "${loai_don_hang}". ` +
            `Valid values are: ${validOrderTypes.join(", ")}. ` +
            `Note: XUAT_KHO is a warehouse transaction type (loai_phieu_kho), not an order type (loai_don_hang).`,
        );
      }
      conditions.push(`d.loai_don_hang::text = $${idx++}`);
      values.push(loai_don_hang);
    }
    if (ma_ben_xuat) {
      conditions.push(`d.ma_ben_xuat = $${idx++}`);
      values.push(ma_ben_xuat);
    }
    if (ma_ben_nhap) {
      conditions.push(`d.ma_ben_nhap = $${idx++}`);
      values.push(ma_ben_nhap);
    }
    if (trang_thai) {
      conditions.push(`d.trang_thai::text = $${idx++}`);
      values.push(trang_thai);
    }
    // Warehouse Isolation: User in Warehouse A should see orders involving Warehouse A (as Source or Destination)
    const activeMaKho = ma_kho || ma_ben_nhap || ma_ben_xuat;
    if (activeMaKho) {
      const ma_kho_arr = Array.isArray(activeMaKho) ? activeMaKho : [activeMaKho];
      values.push(ma_kho_arr);
      conditions.push(
        `( (d.ma_ben_xuat = ANY($${idx}) AND d.loai_ben_xuat = 'KHO') OR (d.ma_ben_nhap = ANY($${idx}) AND d.loai_ben_nhap = 'KHO') )`,
      );
      idx++;
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT 
        d.*,
        COALESCE(kx.ten_kho, dx.ten_doi_tac) as ten_ben_xuat,
        COALESCE(kn.ten_kho, dn.ten_doi_tac) as ten_ben_nhap,
        COALESCE(u.ho_ten, u.username) as ten_nguoi_tao
      FROM tm_don_hang d
      LEFT JOIN sys_kho kx ON d.ma_ben_xuat = kx.ma_kho AND d.loai_ben_xuat = 'KHO'
      LEFT JOIN dm_doi_tac dx ON d.ma_ben_xuat = dx.ma_doi_tac AND d.loai_ben_xuat = 'DOI_TAC'
      LEFT JOIN sys_kho kn ON d.ma_ben_nhap = kn.ma_kho AND d.loai_ben_nhap = 'KHO'
      LEFT JOIN dm_doi_tac dn ON d.ma_ben_nhap = dn.ma_doi_tac AND d.loai_ben_nhap = 'DOI_TAC'
      LEFT JOIN sys_user u ON d.created_by = u.id
      ${whereClause} 
      ORDER BY d.created_at DESC 
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const countQuery = `SELECT COUNT(*) FROM tm_don_hang d ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [...values, limit, offset]),
      pool.query(countQuery, values),
    ]);

    return {
      data: dataResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    };
  }

  /**
   * Get detail of a specific order
   */
  static async getOrderById(idOrNo) {
    const orderResult = await pool.query(
      `SELECT 
        d.*,
        COALESCE(kx.ten_kho, dx.ten_doi_tac) as ten_ben_xuat,
        COALESCE(kn.ten_kho, dn.ten_doi_tac) as ten_ben_nhap,
        u.ho_ten as ten_nguoi_tao
       FROM tm_don_hang d
       LEFT JOIN sys_kho kx ON d.ma_ben_xuat = kx.ma_kho AND d.loai_ben_xuat = 'KHO'
       LEFT JOIN dm_doi_tac dx ON d.ma_ben_xuat = dx.ma_doi_tac AND d.loai_ben_xuat = 'DOI_TAC'
       LEFT JOIN sys_kho kn ON d.ma_ben_nhap = kn.ma_kho AND d.loai_ben_nhap = 'KHO'
       LEFT JOIN dm_doi_tac dn ON d.ma_ben_nhap = dn.ma_doi_tac AND d.loai_ben_nhap = 'DOI_TAC'
       LEFT JOIN sys_user u ON d.created_by = u.id
       WHERE d.so_don_hang = $1 
       OR (CASE WHEN $1::text ~ '^\\d+$' THEN d.id = $1::text::int ELSE FALSE END)`,
      [idOrNo],
    );
    const order = orderResult.rows[0];
    if (!order) return null;

    const itemsResult = await pool.query(
      `SELECT 
        ct.*,
        hh.ten_hang_hoa,
        hh.don_vi_tinh
       FROM tm_don_hang_chi_tiet ct
       LEFT JOIN tm_hang_hoa hh ON ct.ma_hang_hoa = hh.ma_hang_hoa
       WHERE ct.so_don_hang = $1 
       ORDER BY ct.stt`,
      [order.so_don_hang],
    );
    return {
      ...order,
      items: itemsResult.rows,
    };
  }

  /**
   * [P0-3] Reverse inventory & financials for all invoices of an order
   * Gọi khi hủy đơn ở trạng thái DANG_GIAO (tức là đã có hóa đơn được tạo)
   */
  static async _reverseInvoice(client, so_don_hang, userId) {
    // 1. Lấy tất cả hóa đơn chưa hủy của đơn hàng này
    const hdRes = await client.query(
      `SELECT * FROM tm_hoa_don WHERE so_don_hang = $1 AND trang_thai != 'DA_HUY'`,
      [so_don_hang],
    );

    for (const hd of hdRes.rows) {
      // 2. Lấy chi tiết hóa đơn
      const ctRes = await client.query(
        `SELECT ct.*, hh.loai_quan_ly
         FROM tm_hoa_don_chi_tiet ct
         JOIN tm_hang_hoa hh ON ct.ma_hang_hoa = hh.ma_hang_hoa
         WHERE ct.so_hoa_don = $1`,
        [hd.so_hoa_don],
      );

      // 3. Xác định kho cần hoàn hàng (kho xuất ban đầu)
      const maKhoHoan = hd.ma_ben_xuat;

      for (const item of ctRes.rows) {
        if (item.loai_quan_ly === "SERIAL" && item.ma_serial) {
          // Hoàn xe về kho: đặt lại trạng thái TON_KHO, xóa ngày bán
          // Hoàn xe về kho: đặt lại trạng thái TON_KHO, xóa ngày bán, mở khóa
          await client.query(
            `UPDATE tm_hang_hoa_serial
             SET trang_thai = 'TON_KHO',
                 ma_kho_hien_tai = $1,
                 ngay_ban = NULL,
                 so_hoa_don_ban = NULL,
                 locked = FALSE,
                 locked_at = NULL,
                 locked_reason = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE ma_serial = $2`,
            [maKhoHoan, item.ma_serial],
          );
          // Ghi lịch sử hoàn hàng
          await client.query(
            `INSERT INTO tm_hang_hoa_lich_su
               (ma_hang_hoa, ma_serial, loai_giao_dich, so_chung_tu, ma_kho_nhap, so_luong, don_gia, nguoi_thuc_hien, dien_giai)
             VALUES ($1, $2, 'HOAN_HANG', $3, $4, 1, $5, $6, $7)`,
            [
              item.ma_hang_hoa,
              item.ma_serial,
              hd.so_hoa_don,
              maKhoHoan,
              item.don_gia,
              userId,
              `Hoàn kho khi hủy đơn hàng ${so_don_hang}`,
            ],
          );
        } else if (item.loai_quan_ly !== "SERIAL" && item.so_luong > 0) {
          // Hoàn phụ tùng: cộng lại số lượng tồn kho
          await client.query(
            `UPDATE tm_hang_hoa_ton_kho
             SET so_luong_ton = so_luong_ton + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE ma_hang_hoa = $2 AND ma_kho = $3`,
            [item.so_luong, item.ma_hang_hoa, maKhoHoan],
          );
          // Ghi lịch sử hoàn hàng
          await client.query(
            `INSERT INTO tm_hang_hoa_lich_su
               (ma_hang_hoa, loai_giao_dich, so_chung_tu, ma_kho_nhap, so_luong, don_gia, nguoi_thuc_hien, dien_giai)
             VALUES ($1, 'HOAN_HANG', $2, $3, $4, $5, $6, $7)`,
            [
              item.ma_hang_hoa,
              hd.so_hoa_don,
              maKhoHoan,
              item.so_luong,
              item.don_gia,
              userId,
              `Hoàn kho khi hủy đơn hàng ${so_don_hang}`,
            ],
          );
        }
      }

      // 4. Hủy hóa đơn
      await client.query(
        `UPDATE tm_hoa_don SET trang_thai = 'DA_HUY' WHERE so_hoa_don = $1`,
        [hd.so_hoa_don],
      );

      // 5. Hoàn công nợ: trừ lại số nợ đã ghi
      const isBan =
        hd.loai_hoa_don === "BAN_HANG" || hd.loai_hoa_don === "BAN_XE";
      const isMua =
        hd.loai_hoa_don === "MUA_HANG" || hd.loai_hoa_don === "MUA_XE";

      if (isBan && hd.ma_ben_nhap) {
        // Hoàn công nợ phải thu (khách không còn nợ nữa)
        await client.query(
          `UPDATE tm_cong_no_doi_tac
           SET tong_no = GREATEST(tong_no - $1, 0),
               updated_at = CURRENT_TIMESTAMP
           WHERE ma_doi_tac = $2 AND loai_cong_no = 'PHAI_THU'`,
          [Number(hd.thanh_tien), hd.ma_ben_nhap],
        );
        // Đánh dấu chi tiết công nợ là đã hủy
        await client.query(
          `UPDATE tm_cong_no_doi_tac_ct
           SET trang_thai = 'DA_HUY'
           WHERE so_hoa_don = $1 AND ma_doi_tac = $2 AND loai_cong_no = 'PHAI_THU'`,
          [hd.so_hoa_don, hd.ma_ben_nhap],
        );
      } else if (isMua && hd.ma_ben_xuat) {
        // Hoàn công nợ phải trả (không nợ NCC nữa)
        await client.query(
          `UPDATE tm_cong_no_doi_tac
           SET tong_no = GREATEST(tong_no - $1, 0),
               updated_at = CURRENT_TIMESTAMP
           WHERE ma_doi_tac = $2 AND loai_cong_no = 'PHAI_TRA'`,
          [Number(hd.thanh_tien), hd.ma_ben_xuat],
        );
        await client.query(
          `UPDATE tm_cong_no_doi_tac_ct
           SET trang_thai = 'DA_HUY'
           WHERE so_hoa_don = $1 AND ma_doi_tac = $2 AND loai_cong_no = 'PHAI_TRA'`,
          [hd.so_hoa_don, hd.ma_ben_xuat],
        );
      }
    }
  }

  /**
   * Update Order Header (VAT, Discount, Notes) - Only allowed in NHAP status
   */
  static async updateOrder(so_don_hang, updateData) {
    const { vat_percentage, chiet_khau, ghi_chu } = updateData;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Get current order and verify status
      const orderResult = await client.query(
        `SELECT * FROM tm_don_hang 
         WHERE so_don_hang = $1::text 
         OR (CASE WHEN $1::text ~ '^\\d+$' THEN id = $1::text::int ELSE FALSE END)`,
        [so_don_hang],
      );
      const order = orderResult.rows[0];
      if (!order) throw new Error("Đơn hàng không tồn tại");

      // STRICT CHECK: Only allow updates in NHAP status
      if (order.trang_thai !== "NHAP") {
        throw new Error(
          `Không thể chỉnh sửa đơn hàng ở trạng thái ${order.trang_thai}. Chỉ được phép chỉnh sửa khi đơn hàng ở trạng thái Nháp (NHAP).`,
        );
      }

      // 2. Update header fields
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (vat_percentage !== undefined) {
        updates.push(`vat_percentage = $${paramCount++}`);
        values.push(vat_percentage);
      }
      if (chiet_khau !== undefined) {
        updates.push(`chiet_khau = $${paramCount++}`);
        values.push(chiet_khau);
      }
      if (ghi_chu !== undefined) {
        updates.push(`ghi_chu = $${paramCount++}`);
        values.push(ghi_chu);
      }

      if (updates.length === 0) {
        await client.query("ROLLBACK");
        return order; // No updates to apply
      }

      // Recalculate thanh_tien if vat_percentage or chiet_khau are updated
      updates.push(
        `thanh_tien = (tong_gia_tri - COALESCE(chiet_khau, 0) + (tong_gia_tri * COALESCE(vat_percentage, 0) / 100))`,
      );

      const res = await client.query(
        `UPDATE tm_don_hang 
         SET 
          vat_percentage = COALESCE($1, vat_percentage),
          chiet_khau = COALESCE($2, chiet_khau),
          ghi_chu = COALESCE($3, ghi_chu),
          thanh_tien = (tong_gia_tri - COALESCE($2, chiet_khau) + (tong_gia_tri * COALESCE($1, vat_percentage) / 100))
         WHERE so_don_hang = $4 OR (CASE WHEN $4::text ~ '^\\d+$' THEN id = $4::text::int ELSE FALSE END)
         RETURNING *`,
        [vat_percentage, chiet_khau, ghi_chu, so_don_hang],
      );

      await client.query("COMMIT");
      return res.rows[0];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Unlock all vehicles associated with an order
   */
  static async _unlockVehiclesInOrder(client, so_don_hang) {
    const itemsRes = await client.query(
      `SELECT yeu_cau_dac_biet FROM tm_don_hang_chi_tiet WHERE so_don_hang = $1`,
      [so_don_hang],
    );

    for (const row of itemsRes.rows) {
      if (row.yeu_cau_dac_biet && row.yeu_cau_dac_biet.ma_serial) {
        await Xe.unlock(row.yeu_cau_dac_biet.ma_serial, client);
      }
    }
  }

  /**
   * Update Order Status (Approve, Cancel, etc.)
   */
  static async updateStatus(idOrNo, status, userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Check current status
      const checkRes = await client.query(
        `SELECT * FROM tm_don_hang 
         WHERE so_don_hang = $1 
         OR (CASE WHEN $1::text ~ '^\\d+$' THEN id = $1::text::int ELSE FALSE END)`,
        [idOrNo],
      );

      if (checkRes.rowCount === 0) throw new Error("Đơn hàng không tồn tại");
      const order = checkRes.rows[0];
      const currentStatus = order.trang_thai;

      // Business Rule: Chỉ cho phép hủy đơn ở NHAP, DA_DUYET, DANG_GIAO
      const cancelableStatuses = ["NHAP", "DA_DUYET", "DANG_GIAO"];
      if (status === "DA_HUY" && !cancelableStatuses.includes(currentStatus)) {
        throw new Error(
          `Không thể hủy đơn hàng ở trạng thái ${currentStatus}. Chỉ có thể hủy khi đơn ở Nháp, Đã duyệt hoặc Đang giao.`,
        );
      }

      // [P0-3] Hoàn kho nếu hủy đơn đang giao dở
      if (status === "DA_HUY") {
        if (currentStatus === "DANG_GIAO") {
          await this._reverseInvoice(client, order.so_don_hang, userId);
        } else {
          // Chỉ cần mở khóa xe nếu chưa tạo hóa đơn (NHAP, DA_DUYET)
          await this._unlockVehiclesInOrder(client, order.so_don_hang);
        }
      }

      const updatedOrderResult = await client.query(
        `UPDATE tm_don_hang 
         SET 
          trang_thai = $1::enum_trang_thai_don_hang, 
          nguoi_duyet = CASE WHEN $1::text = 'DA_DUYET' THEN $2::text ELSE nguoi_duyet END,
          ngay_duyet = CASE WHEN $1::text = 'DA_DUYET' THEN NOW() ELSE ngay_duyet END
         WHERE so_don_hang = $3 
         OR (CASE WHEN $3::text ~ '^\\d+$' THEN id = $3::text::int ELSE FALSE END)
         RETURNING *`,
        [status, userId, idOrNo],
      );

      const updatedOrder = updatedOrderResult.rows[0];

      await client.query("COMMIT");

      // Fetch updater name for notification
      const userRes = await pool.query(
        "SELECT ho_ten FROM sys_user WHERE id = $1",
        [userId],
      );
      const ten_nguoi_sua = userRes.rows[0]?.ho_ten || userId;

      // Notify about status change
      NotificationService.notifyUser(
        updatedOrder.created_by,
        "Trạng thái đơn hàng thay đổi",
        `Đơn hàng ${updatedOrder.so_don_hang} đã được ${ten_nguoi_sua} chuyển sang trạng thái: ${status}${
          status === "DA_HUY" && currentStatus === "DANG_GIAO"
            ? " (Kho đã được hoàn tự động)"
            : ""
        }`,
        `/orders/view/${updatedOrder.so_don_hang}`,
        "SYSTEM",
      ).catch((err) => console.error("Notification Error:", err));

      return updatedOrder;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Manual Payment for Orders/Invoices (Thanh toán công nợ Mua Hàng)
  static async thanhToan(data, nguoi_thuc_hien) {
    const { so_hoa_don, so_tien, hinh_thuc, ghi_chu } = data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get Invoice Info
      const hdRes = await client.query(
        "SELECT * FROM tm_hoa_don WHERE so_hoa_don = $1",
        [so_hoa_don],
      );
      if (hdRes.rowCount === 0) throw new Error("Hóa đơn không tồn tại");
      const hd = hdRes.rows[0];

      // Create Payment Voucher
      const phieuChi = await ThuChiService.taoPhieu(
        {
          nguoi_tao: nguoi_thuc_hien,
          ngay_giao_dich: new Date(),
          ma_kho: hd.ma_ben_nhap, // Kho nhập (trả tiền)
          ma_kh: hd.ma_ben_xuat, // NCC (nhận tiền)
          so_tien: so_tien,
          loai: "CHI",
          hinh_thuc: hinh_thuc || "TIEN_MAT",
          dien_giai: ghi_chu || `Thanh toán công nợ hóa đơn ${so_hoa_don}`,
          ma_hoa_don: so_hoa_don,
        },
        client,
      );

      // Approve
      await ThuChiService.pheDuyet(
        phieuChi.so_phieu_tc,
        nguoi_thuc_hien,
        client,
      );

      await client.query("COMMIT");
      return phieuChi;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = OrderService;
