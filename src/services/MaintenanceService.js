const BaoTri = require("../models/BaoTri");
const NhacNho = require("../models/NhacNho");
const Notification = require("../models/Notification");
const User = require("../models/User");
const PushNotificationService = require("./pushNotification.service");
const CongNoService = require("./congNo.service");
const logger = require("../utils/logger");
const { query, transaction } = require("../config/database");
const { generateCode } = require("../utils/codeGenerator");

class MaintenanceService {
  /**
   * Kiểm tra trạng thái bảo hành / bảo trì miễn phí
   * Giả định: 6 tháng hoặc 10,000 km đầu tiên là miễn phí công bảo dưỡng
   */
  static checkWarrantyStatus(ngay_ban, so_km_hien_tai) {
    if (!ngay_ban)
      return { is_eligible: false, reason: "Không có thông tin ngày bán" };

    const sellDate = new Date(ngay_ban);
    const today = new Date();
    const diffMonths =
      (today.getFullYear() - sellDate.getFullYear()) * 12 +
      (today.getMonth() - sellDate.getMonth());

    const KM_LIMIT = 10000;
    const MONTH_LIMIT = 6;

    if (diffMonths <= MONTH_LIMIT && (so_km_hien_tai || 0) <= KM_LIMIT) {
      return {
        is_eligible: true,
        message: "Trong hạn bảo trì miễn phí (Dưới 6 tháng & 10,000km)",
        diffMonths,
        so_km_hien_tai,
      };
    }

    return {
      is_eligible: false,
      message: "Hết hạn bảo trì miễn phí",
      diffMonths,
      so_km_hien_tai,
    };
  }

  /**
   * Kiểm tra xe có trong hệ thống chưa.
   * Nếu chưa → tự động tạo bản ghi xe ngoài
   *   (la_xe_cua_hang = FALSE, trang_thai = 'XE_NGOAI').
   * Trả về { la_xe_cua_hang, da_tao_moi, warranty }
   */
  static async resolveOrRegisterXe(ma_serial, ma_hang_hoa, so_khung) {
    const existing = await query(
      `SELECT ma_serial, la_xe_cua_hang, ngay_ban, so_km_hien_tai 
       FROM tm_hang_hoa_serial WHERE ma_serial = $1`,
      [ma_serial],
    );

    if (existing.rows.length > 0) {
      const xe = existing.rows[0];
      const warranty = this.checkWarrantyStatus(xe.ngay_ban, xe.so_km_hien_tai);
      return {
        la_xe_cua_hang: xe.la_xe_cua_hang,
        da_tao_moi: false,
        warranty,
      };
    }

    // Xe không có → Đăng ký là xe ngoài
    if (!ma_hang_hoa) {
      throw {
        status: 400,
        message:
          "Xe không có trong hệ thống. Vui lòng cung cấp loại xe (ma_hang_hoa) để đăng ký xe ngoài.",
      };
    }

    // Kiểm tra xe ngoài - Người dùng có thể chọn hoặc nhập tự do
    let actualProductId = ma_hang_hoa;
    let actualNote =
      "Xe khách mang từ ngoài - tự động đăng ký qua phiếu sửa chữa";

    const checkProduct = await query(
      `SELECT ma_hang_hoa FROM tm_hang_hoa WHERE ma_hang_hoa = $1 OR ten_hang_hoa ILIKE $1 LIMIT 1`,
      [ma_hang_hoa],
    );

    if (checkProduct.rows.length === 0) {
      // The user typed a custom model name instead of selecting a valid ID
      actualNote = `Model xe vãng lai: ${ma_hang_hoa}. Xe khách mang từ ngoài vào.`;

      const genericXe = await query(
        `SELECT ma_hang_hoa FROM tm_hang_hoa WHERE ma_hang_hoa = 'XE_NGOAI'`,
      );
      if (genericXe.rows.length === 0) {
        // Ensure "XE" group exists or use NULL if it doesn't
        const nhomXe = await query(
          `SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE' LIMIT 1`,
        );
        const groupXe = nhomXe.rows.length > 0 ? "XE" : null;

        await query(
          `INSERT INTO tm_hang_hoa (ma_hang_hoa, ten_hang_hoa, ma_nhom_hang, loai_quan_ly, don_vi_tinh, status)
           VALUES ('XE_NGOAI', 'Xe Vãng Lai (Ngoài HT)', $1, 'SERIAL', 'Chiếc', true)`,
          [groupXe],
        );
      }
      actualProductId = "XE_NGOAI";
    } else {
      // If they typed the name and we found it, map it to the actual product ID
      actualProductId = checkProduct.rows[0].ma_hang_hoa;
    }

    // DEBUG Check first
    const confirmProduct = await query(
      `SELECT ma_hang_hoa FROM tm_hang_hoa WHERE ma_hang_hoa = $1`,
      [actualProductId],
    );
    if (confirmProduct.rows.length === 0) {
      throw new Error(
        `[DEBUG] Attempted to use actualProductId='${actualProductId}' but it does not exist in tm_hang_hoa!`,
      );
    }

    try {
      await query(
        `INSERT INTO tm_hang_hoa_serial (
          ma_serial, ma_hang_hoa, serial_identifier,
          trang_thai, la_xe_cua_hang, ghi_chu
        ) VALUES ($1, $2, $3, 'XE_NGOAI', FALSE, $4)`,
        [ma_serial, actualProductId, so_khung || ma_serial, actualNote],
      );
    } catch (insertErr) {
      logger.error(
        `[DEBUG Insert Error] ProductId: ${actualProductId}`,
        insertErr,
      );
      throw insertErr;
    }

    logger.info(`[Maintenance] Đã đăng ký xe ngoài: ${ma_serial}`);
    return { la_xe_cua_hang: false, da_tao_moi: true };
  }

  // Tạo phiếu bảo trì
  static async createMaintenanceRecord(data) {
    // Bước 1: Xác định xe / tự động đăng ký nếu là xe ngoài
    const { la_xe_cua_hang, da_tao_moi } = await this.resolveOrRegisterXe(
      data.ma_serial,
      data.ma_hang_hoa, // FE gửi kèm nếu xe chưa có trong hệ thống
      data.so_khung, // Số khung thực tế
    );

    // Tính toán tiền phụ tùng và tiền công
    let tien_phu_tung = 0;
    let tien_cong = 0;
    if (data.chi_tiet && Array.isArray(data.chi_tiet)) {
      data.chi_tiet.forEach((item) => {
        const itemTotal = Number(item.so_luong) * Number(item.don_gia);
        item.thanh_tien = itemTotal;
        if (item.loai_hang_muc === "PHU_TUNG") {
          tien_phu_tung += itemTotal;
        } else {
          tien_cong += itemTotal;
        }
      });
      data.tien_phu_tung = tien_phu_tung;
      data.tien_cong = tien_cong;
      data.tong_tien = tien_phu_tung + tien_cong;
    }

    if (!data.trang_thai) data.trang_thai = "TIEP_NHAN";

    if (data.ma_ban_nang) {
      data.trang_thai = "DANG_SUA";
      data.thoi_gian_bat_dau = new Date();
    }

    // Bước 2: Tạo phiếu bảo trì
    if (!data.ma_phieu) {
      data.ma_phieu = await generateCode("tm_bao_tri", "ma_phieu", "BT", 10);
    }

    // Tạo transaction cho việc tạo phiếu và cập nhật bàn nâng nếu có
    const finalResult = await transaction(async (client) => {
      // Cập nhật trạng thái bàn nâng nếu có gắn xe vào bàn
      if (data.ma_ban_nang) {
        await client.query(
          `UPDATE dm_ban_nang SET trang_thai = 'DANG_SUA' WHERE ma_ban_nang = $1`,
          [data.ma_ban_nang],
        );
      }

      const phieu = await BaoTri.create(data);

      // Bước 3: Tạo nhắc nhở bảo trì tiếp theo (giữ nguyên logic nhắc)
      const nextKM = parseInt(data.so_km_hien_tai) + 2000;
      await client.query(
        `INSERT INTO tm_nhac_nho_bao_duong (ma_serial, ma_khach_hang, loai_nhac_nho, ngay_du_kien, so_km_du_kien) 
           VALUES ($1, $2, 'BAO_DUONG_DINH_KY', $3, $4)`,
        [
          data.ma_serial,
          data.ma_doi_tac,
          new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          nextKM,
        ],
      );
      return phieu;
    });

    return {
      ...finalResult,
      la_xe_cua_hang,
      da_tao_moi_xe_ngoai: da_tao_moi,
    };
  }

  // Lấy danh sách bàn nâng
  static async getBanNang() {
    const res = await query(`
      SELECT bn.*, 
             t.ma_phieu, t.ma_serial, t.tien_cong, t.tien_phu_tung,
             u.username as ten_ktv
      FROM dm_ban_nang bn
      LEFT JOIN (
         SELECT ma_phieu, ma_ban_nang, ma_serial, tien_cong, tien_phu_tung, ktv_chinh 
         FROM tm_bao_tri 
         WHERE trang_thai IN ('TIEP_NHAN', 'DANG_SUA', 'CHO_THANH_TOAN')
      ) t ON bn.ma_ban_nang = t.ma_ban_nang
      LEFT JOIN sys_user u ON t.ktv_chinh = u.id
      ORDER BY bn.ma_ban_nang ASC
    `);
    return res.rows;
  }

  // Cập nhật trạng thái phiếu (và có thể gắn bàn nâng mới)
  static async updateStatus(
    ma_phieu,
    { trang_thai, ma_ban_nang, ma_kho, user },
  ) {
    const phieuData = await BaoTri.getById(ma_phieu);
    if (!phieuData) throw { status: 404, message: "Không tìm thấy phiếu" };

    return await transaction(async (client) => {
      // Nếu đổi bàn nâng
      if (ma_ban_nang && ma_ban_nang !== phieuData.ma_ban_nang) {
        // Trả bàn nâng cũ về 'TRONG'
        if (phieuData.ma_ban_nang) {
          await client.query(
            `UPDATE dm_ban_nang SET trang_thai = 'TRONG' WHERE ma_ban_nang = $1`,
            [phieuData.ma_ban_nang],
          );
        }
        // Gắn bàn mới
        await client.query(
          `UPDATE dm_ban_nang SET trang_thai = 'DANG_SUA' WHERE ma_ban_nang = $1`,
          [ma_ban_nang],
        );
      }

      // Xử lý trừ tồn kho thật nếu trạng thái = HOAN_THANH
      if (
        trang_thai === "HOAN_THANH" &&
        phieuData.trang_thai !== "HOAN_THANH"
      ) {
        if (!ma_kho && !phieuData.ma_kho)
          throw {
            status: 400,
            message: "Phiếu chưa có kho xuất kho phụ tùng.",
          };

        const khoXuat = ma_kho || phieuData.ma_kho;

        // Duyệt trừ kho từng món phụ tùng
        const phu_tung = phieuData.chi_tiet.filter(
          (i) => i.loai_hang_muc === "PHU_TUNG" && i.ma_hang_hoa,
        );
        for (const item of phu_tung) {
          const stockRes = await client.query(
            `SELECT so_luong_ton FROM tm_hang_hoa_ton_kho WHERE ma_hang_hoa = $1 AND ma_kho = $2 FOR UPDATE`,
            [item.ma_hang_hoa, khoXuat],
          );
          if (
            stockRes.rows.length === 0 ||
            stockRes.rows[0].so_luong_ton < item.so_luong
          ) {
            throw new Error(
              `Không đủ hàng cho ${item.ten_hang_muc} (Mã: ${item.ma_hang_hoa}). Hiện có: ${stockRes.rows[0]?.so_luong_ton || 0}`,
            );
          }
          await client.query(
            `UPDATE tm_hang_hoa_ton_kho SET so_luong_ton = so_luong_ton - $1 WHERE ma_hang_hoa = $2 AND ma_kho = $3`,
            [item.so_luong, item.ma_hang_hoa, khoXuat],
          );
          // Ghi log
          await client.query(
            `INSERT INTO tm_hang_hoa_lich_su (ma_hang_hoa, loai_giao_dich, so_chung_tu, ma_kho_xuat, so_luong, nguoi_thuc_hien, dien_giai)
              VALUES ($1, 'XUAT_BAO_TRI', $2, $3, $4, $5, $6)`,
            [
              item.ma_hang_hoa,
              ma_phieu,
              khoXuat,
              item.so_luong,
              user,
              `Sửa chữa xe ${phieuData.ma_serial}`,
            ],
          );
        }

        // Giải phóng bàn nâng
        if (phieuData.ma_ban_nang || ma_ban_nang) {
          await client.query(
            `UPDATE dm_ban_nang SET trang_thai = 'TRONG' WHERE ma_ban_nang = $1`,
            [ma_ban_nang || phieuData.ma_ban_nang],
          );
        }

        // --- GHI NHẬN CÔNG NỢ KHÁCH HÀNG ---
        if (phieuData.tong_tien > 0) {
          await CongNoService.recordDoiTacDebt(client, {
            ma_doi_tac: phieuData.ma_doi_tac,
            loai_cong_no: "PHAI_THU",
            so_hoa_don: ma_phieu,
            ngay_phat_sinh: new Date(),
            so_tien: phieuData.tong_tien,
            ghi_chu: `Dịch vụ sửa chữa/bảo trì xe theo phiếu ${ma_phieu}`,
          });
        }
      }

      // Nếu HỦY phiếu thì giải phóng bàn nâng
      if (trang_thai === "DA_HUY" && (phieuData.ma_ban_nang || ma_ban_nang)) {
        await client.query(
          `UPDATE dm_ban_nang SET trang_thai = 'TRONG' WHERE ma_ban_nang = $1`,
          [ma_ban_nang || phieuData.ma_ban_nang],
        );
      }

      // Cập nhật thông tin phiếu
      await client.query(
        `
        UPDATE tm_bao_tri 
        SET trang_thai = $1, 
            ma_ban_nang = $2, 
            ma_kho = COALESCE($3, ma_kho),
            thoi_gian_ket_thuc = CASE WHEN $1 = 'HOAN_THANH' THEN CURRENT_TIMESTAMP ELSE thoi_gian_ket_thuc END
        WHERE ma_phieu = $4
      `,
        [
          trang_thai,
          ma_ban_nang || phieuData.ma_ban_nang,
          ma_kho || null,
          ma_phieu,
        ],
      );

      return { ma_phieu, status: trang_thai };
    });
  }

  // Chạy trình nhắc nhở hàng ngày (Rút gọn)
  static async runDailyReminders() {
    return { remindersSent: 0 };
  }
}

module.exports = MaintenanceService;
