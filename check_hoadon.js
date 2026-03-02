const { pool } = require("./src/config/database");

async function check() {
  try {
    // Kiểm tra trạng thái hóa đơn bán hàng
    const r1 = await pool.query(`
      SELECT so_hoa_don, trang_thai, thanh_tien, ngay_hoa_don 
      FROM tm_hoa_don 
      WHERE loai_hoa_don='BAN_HANG' 
      ORDER BY created_at DESC LIMIT 10
    `);
    console.log("=== HOA DON BAN HANG ===");
    console.log(JSON.stringify(r1.rows, null, 2));

    // Kiểm tra phiếu thu chi gần đây
    const r2 = await pool.query(`
      SELECT so_phieu_tc, loai_phieu, so_tien, trang_thai, ma_hoa_don, ngay_giao_dich
      FROM tm_phieu_thu_chi
      ORDER BY created_at DESC LIMIT 10
    `);
    console.log("\n=== PHIEU THU CHI ===");
    console.log(JSON.stringify(r2.rows, null, 2));

    // Kiểm tra doanh thu theo query mới (DA_XUAT included)
    const r3 = await pool.query(`
      SELECT trang_thai, COUNT(*) as so_luong, SUM(thanh_tien) as tong
      FROM tm_hoa_don
      WHERE loai_hoa_don='BAN_HANG'
      GROUP BY trang_thai
    `);
    console.log("\n=== THONG KE TRANG THAI HOA DON ===");
    console.log(JSON.stringify(r3.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
