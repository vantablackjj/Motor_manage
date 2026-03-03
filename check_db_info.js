require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query("SHOW TIMEZONE");
    console.log("DB TimeZone:", res.rows[0]);

    const res2 = await pool.query(
      "SELECT NOW(), CURRENT_DATE, (NOW()::date)::text as date_cast",
    );
    console.log("DB Time info:", res2.rows[0]);

    // Let's check the last few maintenance records and their dates
    const res3 = await pool.query(`
      SELECT ma_phieu, tong_tien, trang_thai, thoi_gian_ket_thuc, 
             (thoi_gian_ket_thuc::date)::text as date_only 
      FROM tm_bao_tri 
      ORDER BY created_at DESC LIMIT 5
    `);
    console.log("Recent Maintenance:", JSON.stringify(res3.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
