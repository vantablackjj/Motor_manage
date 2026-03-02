const { pool } = require("./src/config/database");

async function checkMarchData() {
  try {
    console.log("--- KIỂM TRA DỮ LIỆU THÁNG 03/2026 ---");

    // 1. Kiểm tra hóa đơn trong tháng 3
    const hoadon = await pool.query(`
      SELECT so_hoa_don, trang_thai, thanh_tien, ngay_hoa_don, created_at 
      FROM tm_hoa_don 
      WHERE ngay_hoa_don >= '2026-03-01'
      ORDER BY created_at DESC
    `);
    console.log("\n1. Hóa đơn tháng 3:", hoadon.rows.length);
    console.log(JSON.stringify(hoadon.rows, null, 2));

    // 2. Kiểm tra phiếu thu chi trong tháng 3
    const phieu = await pool.query(`
      SELECT so_phieu_tc, loai_phieu, so_tien, trang_thai, ma_hoa_don, ngay_giao_dich, created_at
      FROM tm_phieu_thu_chi
      WHERE ngay_giao_dich >= '2026-03-01'
      ORDER BY created_at DESC
    `);
    console.log("\n2. Phiếu thu chi tháng 3:", phieu.rows.length);
    console.log(JSON.stringify(phieu.rows, null, 2));

    // 3. Kiểm tra định dạng cột ngày
    const schema = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tm_hoa_don' AND column_name IN ('ngay_hoa_don', 'created_at')
    `);
    console.log(
      "\n3. Kiểu dữ liệu cột ngày:",
      JSON.stringify(schema.rows, null, 2),
    );
  } catch (e) {
    console.error("Lỗi kiểm tra:", e.message);
  } finally {
    await pool.end();
  }
}
checkMarchData();
