require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    console.log("--- MAINTENANCE REVENUE DEBUG ---");
    const res = await pool.query(`
      SELECT ma_phieu, tong_tien, trang_thai, ngay_bao_tri, thoi_gian_ket_thuc, created_at, 
             (thoi_gian_ket_thuc::date)::text as finish_date
      FROM tm_bao_tri 
      WHERE trang_thai = 'HOAN_THANH'
      ORDER BY thoi_gian_ket_thuc DESC
    `);
    console.log(
      "All Completed Maintenance Records:",
      JSON.stringify(res.rows, null, 2),
    );

    console.log("\n--- CASH COLLECTION DEBUG ---");
    const resTC = await pool.query(`
      SELECT so_phieu_tc, so_tien, trang_thai, loai_phieu, ngay_giao_dich, dien_giai,
             (ngay_giao_dich::date)::text as trans_date
      FROM tm_phieu_thu_chi
      WHERE loai_phieu = 'THU'
      ORDER BY ngay_giao_dich DESC
    `);
    console.log("All Revenue Receipts:", JSON.stringify(resTC.rows, null, 2));

    const resNow = await pool.query(
      "SELECT NOW() as db_now, CURRENT_DATE as db_date",
    );
    console.log("\nDatabase Time:", resNow.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
