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
    // Bước 0: Kiểm tra xem xe này có đang trong quá trình bảo trì nào khác chưa hoàn thành không
    const activeMaintenance = await query(
      `SELECT ma_phieu FROM tm_bao_tri WHERE ma_serial = $1 AND trang_thai NOT IN ('HOAN_THANH', 'DA_HUY')`,
      [data.ma_serial],
    );
    if (activeMaintenance.rows.length > 0) {
      throw {
        status: 400,
        message: `Xe ${data.ma_serial} đang trong quá trình bảo trì (Phiếu: ${activeMaintenance.rows[0].ma_phieu}). Vui lòng hoàn thành phiếu cũ trước.`,
      };
    }

    // Bước 0.1: Kiểm tra bàn nâng có đang trống không (nếu có chọn bàn nâng)
    if (data.ma_ban_nang) {
      const banNangStatus = await query(
        `SELECT trang_thai FROM dm_ban_nang WHERE ma_ban_nang = $1`,
        [data.ma_ban_nang],
      );
      if (
        banNangStatus.rows.length > 0 &&
        banNangStatus.rows[0].trang_thai !== "TRONG"
      ) {
        throw {
          status: 400,
          message: `Bàn nâng ${data.ma_ban_nang} đang bận. Vui lòng chọn bàn khác.`,
        };
      }
    }

    // Bước 0.2: Kiểm tra số KM (không được thấp hơn số KM hiện tại trong HT)
    const xeCheck = await query(
      `SELECT so_km_hien_tai FROM tm_hang_hoa_serial WHERE ma_serial = $1`,
      [data.ma_serial],
    );
    if (
      xeCheck.rows.length > 0 &&
      xeCheck.rows[0].so_km_hien_tai > data.so_km_hien_tai
    ) {
      throw {
        status: 400,
        message: `Số KM nhập vào (${data.so_km_hien_tai}) thấp hơn số KM cũ (${xeCheck.rows[0].so_km_hien_tai}). Vui lòng kiểm tra lại.`,
      };
    }

    // Bước 0.2.1: Kiểm tra kỹ thuật viên có đang bận không
    if (data.ktv_chinh) {
      const busyTechnician = await query(
        `SELECT ma_phieu, ma_ban_nang FROM tm_bao_tri WHERE ktv_chinh = $1 AND trang_thai IN ('TIEP_NHAN', 'DANG_SUA', 'CHO_THANH_TOAN')`,
        [data.ktv_chinh],
      );
      if (busyTechnician.rows.length > 0) {
        throw {
          status: 400,
          message: `Kỹ thuật viên này đang bận tại bàn nâng ${busyTechnician.rows[0].ma_ban_nang} (Phiếu: ${busyTechnician.rows[0].ma_phieu}).`,
        };
      }
    }

    // Bước 0.3: Kiểm tra tồn kho sớm (nếu đã chọn kho và có phụ tùng)
    if (data.ma_kho && data.chi_tiet && data.chi_tiet.length > 0) {
      const phu_tung = data.chi_tiet.filter(
        (i) => i.loai_hang_muc === "PHU_TUNG" && i.ma_hang_hoa,
      );
      for (const item of phu_tung) {
        const stockRes = await query(
          `SELECT so_luong_ton FROM tm_hang_hoa_ton_kho WHERE ma_hang_hoa = $1 AND ma_kho = $2`,
          [item.ma_hang_hoa, data.ma_kho],
        );
        const currentStock =
          stockRes.rows.length > 0 ? Number(stockRes.rows[0].so_luong_ton) : 0;
        if (currentStock < Number(item.so_luong)) {
          throw {
            status: 400,
            message: `Kho hiện không đủ hàng cho phụ tùng: ${item.ten_hang_muc}. Hiện có: ${currentStock}, yêu cầu: ${item.so_luong}`,
          };
        }
      }
    }

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
    await transaction(async (client) => {
      // Cập nhật trạng thái bàn nâng nếu có gắn xe vào bàn
      if (data.ma_ban_nang) {
        await client.query(
          `UPDATE dm_ban_nang SET trang_thai = 'DANG_SUA' WHERE ma_ban_nang = $1`,
          [data.ma_ban_nang],
        );
      }

      await BaoTri.create(data);

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
    });

    // Fetch full record to return names (ten_kho, ten_ktv, etc.)
    const fullPhieu = await BaoTri.getById(data.ma_phieu);

    return {
      ...fullPhieu,
      la_xe_cua_hang,
      da_tao_moi_xe_ngoai: da_tao_moi,
    };
  }

  // Lấy danh sách bàn nâng
  static async getBanNang() {
    const res = await query(`
      SELECT bn.*, 
             t.ma_phieu, t.ma_serial, t.tien_cong, t.tien_phu_tung, t.ktv_chinh as ktv_id,
             u.ho_ten as ten_ktv
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
    { trang_thai, ma_ban_nang, ma_kho, hinh_thuc_thanh_toan, user },
  ) {
    const phieuData = await BaoTri.getById(ma_phieu);
    if (!phieuData) throw { status: 404, message: "Không tìm thấy phiếu" };

    return await transaction(async (client) => {
      // Nếu đổi bàn nâng
      if (ma_ban_nang && ma_ban_nang !== phieuData.ma_ban_nang) {
        // Kiểm tra bàn mới có trống không
        const banNangStatus = await client.query(
          `SELECT trang_thai FROM dm_ban_nang WHERE ma_ban_nang = $1`,
          [ma_ban_nang],
        );
        if (
          banNangStatus.rows.length > 0 &&
          banNangStatus.rows[0].trang_thai !== "TRONG"
        ) {
          throw {
            status: 400,
            message: `Bàn nâng ${ma_ban_nang} đang bận. Vui lòng chọn bàn khác.`,
          };
        }

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
            [parseInt(item.so_luong), item.ma_hang_hoa, khoXuat],
          );
          // Ghi log
          await client.query(
            `INSERT INTO tm_hang_hoa_lich_su (ma_hang_hoa, loai_giao_dich, so_chung_tu, ma_kho_xuat, so_luong, nguoi_thuc_hien, dien_giai)
              VALUES ($1, 'XUAT_BAO_TRI', $2, $3, $4, $5, $6)`,
            [
              item.ma_hang_hoa,
              ma_phieu,
              khoXuat,
              parseInt(item.so_luong),
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

        // Cập nhật số KM hiện tại cho xe
        await client.query(
          `UPDATE tm_hang_hoa_serial SET so_km_hien_tai = $1 WHERE ma_serial = $2`,
          [parseInt(phieuData.so_km_hien_tai), phieuData.ma_serial],
        );

        // --- GHI NHẬN CÔNG NỢ & DÒNG TIỀN ---
        if (phieuData.tong_tien > 0) {
          // 1. Ghi nhận công nợ (Luôn ghi nhận để theo dõi lịch sử)
          await CongNoService.recordDoiTacDebt(client, {
            ma_doi_tac: phieuData.ma_doi_tac,
            loai_cong_no: "PHAI_THU",
            so_hoa_don: ma_phieu, // Gắn mã phiếu bảo trì vào để dễ đối soát
            ngay_phat_sinh: new Date(),
            so_tien: phieuData.tong_tien,
            ghi_chu: `Dịch vụ sửa chữa/bảo trì xe theo phiếu ${ma_phieu}`,
          });

          // 2. Mặc định tạo phiếu thu (dòng tiền) nếu hoàn thành
          const ThuChiService = require("./thuChi.service");
          const phieuThu = await ThuChiService.taoPhieu(
            {
              nguoi_tao: user,
              ngay_giao_dich: new Date(),
              ma_kho: khoXuat,
              ma_kh: phieuData.ma_doi_tac,
              so_tien: phieuData.tong_tien,
              loai: "THU",
              hinh_thuc: hinh_thuc_thanh_toan || "TIEN_MAT",
              dien_giai: `Thu tiền dịch vụ sửa chữa/bảo trì xe theo phiếu ${ma_phieu}`,
              ma_hoa_don: ma_phieu,
            },
            client,
          );

          // 3. Duyệt phiếu thu ngay lập tức để dòng tiền chảy về quỹ
          await ThuChiService.pheDuyet(phieuThu.so_phieu_tc, user, client);
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
        SET trang_thai = $1::enum_trang_thai_bao_tri, 
            ma_ban_nang = $2, 
            ma_kho = COALESCE($3, ma_kho),
            thoi_gian_ket_thuc = CASE WHEN $1::text = 'HOAN_THANH' THEN CURRENT_TIMESTAMP ELSE thoi_gian_ket_thuc END
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

  // Lấy danh sách nhắc nhở bảo trì
  static async getReminders(filters = {}) {
    const { search, tu_ngay, den_ngay, trang_thai, limit, page } = filters;
    let sql = `
      SELECT n.*, 
             n.trang_thai as trang_thai_db,
             CASE 
               WHEN n.trang_thai = 'CHUA_XU_LY' THEN 'CHUA_NHAC'
               WHEN n.trang_thai = 'DA_XU_LY' THEN 'DA_NHAC'
               WHEN n.trang_thai = 'KHACH_TU_CHOI' THEN 'KHACH_TU_CHOI'
               WHEN n.trang_thai = 'BO_QUA' THEN 'BO_QUA'
               ELSE n.trang_thai
             END as trang_thai,
             x.serial_identifier as so_khung, 
             hh.ten_hang_hoa as ten_xe,
             d.ten_doi_tac as ten_khach_hang, 
             d.dien_thoai
      FROM tm_nhac_nho_bao_duong n
      LEFT JOIN tm_hang_hoa_serial x ON n.ma_serial = x.ma_serial
      LEFT JOIN tm_hang_hoa hh ON x.ma_hang_hoa = hh.ma_hang_hoa
      LEFT JOIN dm_doi_tac d ON n.ma_khach_hang = d.ma_doi_tac
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (n.ma_serial ILIKE $${params.length} OR d.ten_doi_tac ILIKE $${params.length} OR x.serial_identifier ILIKE $${params.length})`;
    }

    if (trang_thai) {
      let dbStatus = trang_thai;
      if (trang_thai === "CHUA_NHAC") dbStatus = "CHUA_XU_LY";
      else if (trang_thai === "DA_NHAC") dbStatus = "DA_XU_LY";
      else if (trang_thai === "BO_QUA") dbStatus = "BO_QUA";

      params.push(dbStatus);
      sql += ` AND n.trang_thai = $${params.length}`;
    }

    if (tu_ngay) {
      params.push(tu_ngay);
      sql += ` AND n.ngay_du_kien >= $${params.length}`;
    }

    if (den_ngay) {
      params.push(den_ngay);
      sql += ` AND n.ngay_du_kien <= $${params.length}`;
    }

    sql += " ORDER BY n.ngay_du_kien ASC, n.id DESC";

    if (limit) {
      const pageSize = parseInt(limit) || 10;
      const offset = ((parseInt(page) || 1) - 1) * pageSize;
      params.push(pageSize);
      sql += ` LIMIT $${params.length}`;
      params.push(offset);
      sql += ` OFFSET $${params.length}`;
    }

    const res = await query(sql, params);
    return res.rows;
  }

  // Cập nhật trạng thái nhắc nhở
  static async updateReminderStatus(id, payload) {
    const { trang_thai, ghi_chu, ghi_chu_CSKH } = payload;
    let dbStatus = trang_thai;
    if (trang_thai === "CHUA_NHAC") dbStatus = "CHUA_XU_LY";
    else if (trang_thai === "DA_NHAC") dbStatus = "DA_XU_LY";

    // Đồng bộ ghi chú từ FE (ghi_chu_CSKH)
    const finalNote = ghi_chu_CSKH !== undefined ? ghi_chu_CSKH : ghi_chu;

    const updates = [];
    const params = [id];
    let queryIndex = 2;

    if (dbStatus) {
      updates.push(`trang_thai = $${queryIndex++}`);
      params.push(dbStatus);
    }
    if (finalNote !== undefined) {
      updates.push(`ghi_chu = $${queryIndex++}`);
      params.push(finalNote);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE tm_nhac_nho_bao_duong
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING *
    `;

    const res = await query(sql, params);
    return res.rows[0];
  }

  // Chạy trình nhắc nhở hàng ngày
  static async runDailyReminders() {
    let remindersSent = 0;

    await transaction(async (client) => {
      // 1. Đồng bộ các xe đã bán nhưng CHƯA CÓ nhắc nhở (Xử lý dữ liệu cũ hoặc sót)
      // Tìm các xe DA_BAN nhưng chưa có bản ghi nào trong tm_nhac_nho_bao_duong
      const missingRemindersQuery = `
        SELECT s.ma_serial, s.ngay_ban, s.so_km_hien_tai, h.ma_ben_nhap as ma_khach_hang
        FROM tm_hang_hoa_serial s
        JOIN tm_hoa_don_chi_tiet ct ON s.ma_serial = ct.ma_serial
        JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don
        WHERE s.trang_thai = 'DA_BAN'
        AND h.loai_hoa_don = 'BAN_HANG'
        AND NOT EXISTS (
          SELECT 1 FROM tm_nhac_nho_bao_duong n WHERE n.ma_serial = s.ma_serial
        )
      `;
      const missingRes = await client.query(missingRemindersQuery);

      for (const car of missingRes.rows) {
        // Tạo nhắc nhở đầu tiên (30 ngày sau bán hoặc 1000km)
        // Nếu không có ngày bán hợp lệ, lấy ngày hiện tại làm mốc
        let baseDate = new Date();
        if (car.ngay_ban) {
          const testDate = new Date(car.ngay_ban);
          if (!isNaN(testDate.getTime()) && testDate.getFullYear() > 2000) {
            baseDate = testDate;
          }
        }

        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + 30);

        await client.query(
          `INSERT INTO tm_nhac_nho_bao_duong (ma_serial, ma_khach_hang, loai_nhac_nho, ngay_du_kien, so_km_du_kien, trang_thai) 
           VALUES ($1, $2, 'BAO_DUONG_DINH_KY', $3, 1000, 'CHUA_XU_LY')`,
          [car.ma_serial, car.ma_khach_hang, dueDate],
        );
        remindersSent++;
      }

      // 2. Nhắc nhở theo Mốc thời gian (vd: Xe đến hạn 6 tháng, 1 năm...)
      // Tìm các xe đã hoàn thành lần bảo trì trước đó nhưng chưa có lần nhắc tiếp theo
      // Hoặc đơn giản là các mốc định kỳ nếu chưa có nhắc nhở tương đương
      // (Phần này có thể mở rộng thêm tùy theo chính sách bảo hành)

      // 3. Nhắc nhở theo số KM
      // Tìm xe có số KM vượt mốc (2000, 4000...) nhưng chưa có nhắc nhở cho mốc đó
      const kmDueQuery = `
        SELECT s.ma_serial, s.so_km_hien_tai, 
               COALESCE(
                 (SELECT h.ma_ben_nhap FROM tm_hoa_don_chi_tiet ct JOIN tm_hoa_don h ON ct.so_hoa_don = h.so_hoa_don WHERE ct.ma_serial = s.ma_serial AND h.loai_hoa_don = 'BAN_HANG' LIMIT 1),
                 (SELECT ma_doi_tac FROM tm_bao_tri b WHERE b.ma_serial = s.ma_serial ORDER BY thoi_gian_ket_thuc DESC LIMIT 1)
               ) as ma_khach_hang
        FROM tm_hang_hoa_serial s
        WHERE s.so_km_hien_tai >= 2000
      `;
      const kmDueRes = await client.query(kmDueQuery);

      for (const car of kmDueRes.rows) {
        if (!car.ma_khach_hang) continue;

        const mocKm = Math.floor(car.so_km_hien_tai / 2000) * 2000;

        // Kiểm tra xem đã có nhắc nhở cho mốc KM này chưa
        const checkKmRes = await client.query(
          `SELECT id FROM tm_nhac_nho_bao_duong WHERE ma_serial = $1 AND so_km_du_kien = $2`,
          [car.ma_serial, mocKm],
        );

        if (checkKmRes.rows.length === 0) {
          await client.query(
            `INSERT INTO tm_nhac_nho_bao_duong (ma_serial, ma_khach_hang, loai_nhac_nho, ngay_du_kien, so_km_du_kien, trang_thai, ghi_chu) 
             VALUES ($1, $2, 'BAO_DUONG_DINH_KY', CURRENT_DATE + INTERVAL '7 days', $3, 'CHUA_XU_LY', $4)`,
            [
              car.ma_serial,
              car.ma_khach_hang,
              mocKm,
              `Hệ thống tự động phát hiện xe đạt mốc ${mocKm} km.`,
            ],
          );
          remindersSent++;
        }
      }
    });

    return { remindersSent };
  }
}

module.exports = MaintenanceService;
