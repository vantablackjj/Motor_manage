require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query(
      "SELECT * FROM tm_bao_tri WHERE ma_phieu = 'BT00000013'",
    );
    console.log("BT00000013 Data:", JSON.stringify(res.rows, null, 2));

    const resCount = await pool.query("SELECT COUNT(*) FROM tm_bao_tri");
    console.log("Total Maintenance Tickets:", resCount.rows[0].count);

    const resLatest = await pool.query(
      "SELECT ma_phieu, trang_thai, created_at FROM tm_bao_tri ORDER BY created_at DESC LIMIT 5",
    );
    console.log(
      "Latest Maintenance Tickets (by created_at):",
      JSON.stringify(resLatest.rows, null, 2),
    );

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
