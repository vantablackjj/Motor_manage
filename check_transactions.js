require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    console.log("Checking all transactions from the last 24 hours...");

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log("Current Server Time:", now.toISOString());
    console.log("Comparison start (Yesterday):", yesterday.toISOString());

    const resBaoTri = await pool.query(`
      SELECT ma_phieu, tong_tien, trang_thai, thoi_gian_ket_thuc, created_at, updated_at
      FROM tm_bao_tri 
      WHERE updated_at >= NOW() - INTERVAL '1 day'
    `);
    console.log(
      "Maintenance (last 24h):",
      JSON.stringify(resBaoTri.rows, null, 2),
    );

    const resThuChi = await pool.query(`
      SELECT so_phieu_tc, so_tien, trang_thai, loai_phieu, ngay_giao_dich, created_at
      FROM tm_phieu_thu_chi
      WHERE created_at >= NOW() - INTERVAL '1 day'
    `);
    console.log("Thu Chi (last 24h):", JSON.stringify(resThuChi.rows, null, 2));

    const resHoaDon = await pool.query(`
      SELECT so_hoa_don, thanh_tien, trang_thai, ngay_hoa_don, created_at
      FROM tm_hoa_don
      WHERE created_at >= NOW() - INTERVAL '1 day'
    `);
    console.log(
      "Invoices (last 24h):",
      JSON.stringify(resHoaDon.rows, null, 2),
    );

    const resNow = await pool.query(
      "SELECT NOW() as db_now, CURRENT_DATE as db_date",
    );
    console.log("Database NOW:", resNow.rows[0].db_now);
    console.log("Database CURRENT_DATE:", resNow.rows[0].db_date);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
