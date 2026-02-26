const { query } = require("../config/database");

class NhacNho {
  // Tạo nhắc nhở
  static async create(data) {
    const {
      loai_nhac,
      ma_serial,
      ma_doi_tac,
      ngay_nhac_nho,
      so_km_nhac_nho,
      noi_dung,
    } = data;
    const res = await query(
      `INSERT INTO tm_nhac_nho (
        loai_nhac, ma_serial, ma_doi_tac, ngay_nhac_nho, so_km_nhac_nho, noi_dung
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        loai_nhac,
        ma_serial,
        ma_doi_tac,
        ngay_nhac_nho,
        so_km_nhac_nho,
        noi_dung,
      ],
    );
    return res.rows[0];
  }

  // Lấy danh sách nhắc nhở chưa gửi
  static async getPending() {
    const res = await query(
      `SELECT n.*, d.ten_doi_tac, d.dien_thoai, x.serial_identifier as so_khung
       FROM tm_nhac_nho n
       LEFT JOIN dm_doi_tac d ON n.ma_doi_tac = d.ma_doi_tac
       LEFT JOIN tm_hang_hoa_serial x ON n.ma_serial = x.ma_serial
       WHERE n.da_nhac = FALSE AND n.ngay_nhac_nho <= CURRENT_DATE`,
    );
    return res.rows;
  }

  // Đánh dấu đã nhắc
  static async markAsSent(id) {
    await query(
      `UPDATE tm_nhac_nho SET da_nhac = TRUE, ngay_gui_nhac = CURRENT_TIMESTAMP WHERE id = $1`,
      [id],
    );
  }

  // Lấy nhắc nhở sinh nhật trong kỳ (tháng hiện tại)
  static async getBirthdaysThisMonth() {
    const res = await query(
      `SELECT ma_doi_tac, ten_doi_tac, ngay_sinh, dien_thoai
       FROM dm_doi_tac
       WHERE status = TRUE 
       AND loai_doi_tac = 'KHACH_HANG'
       AND EXTRACT(MONTH FROM ngay_sinh) = EXTRACT(MONTH FROM CURRENT_DATE)`,
    );
    return res.rows;
  }

  // Lấy các xe đến hạn bảo trì theo KM
  // Giả sử bảo trì định kỳ mỗi 2000km, 4000km, 6000km...
  static async getDueMaintenanceByKM() {
    // Logic: Tìm những xe có km hiện tại gần với mốc 1000, 3000, 5000... (hoặc bất kỳ logic nào)
    // Hoặc kiểm tra xem đã có nhắc nhở nào cho mốc KM tiếp theo chưa
    const res = await query(
      `SELECT x.ma_serial, x.serial_identifier, x.so_km_hien_tai, d.ma_doi_tac, d.ten_doi_tac
       FROM tm_hang_hoa_serial x
       JOIN dm_doi_tac d ON x.ma_serial IN (
         SELECT ma_serial FROM tm_bao_tri WHERE ma_doi_tac = d.ma_doi_tac
       )
       WHERE x.so_km_hien_tai >= 1000 -- Ví dụ mốc đầu tiên
    `,
    );
    // Note: Thực tế cần logic phức tạp hơn để tính mốc bảo trì tiếp theo.
    return res.rows;
  }
}

module.exports = NhacNho;
