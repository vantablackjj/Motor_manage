require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query(
      "SELECT * FROM tm_bao_tri WHERE ma_phieu = 'BT00000013'",
    );
    console.log("BT00000013 Data:", JSON.stringify(res.rows, null, 2));

    const resNow = await pool.query(
      "SELECT NOW() as db_now, CURRENT_DATE as db_date",
    );
    console.log("DB NOW:", resNow.rows[0].db_now);
    console.log("DB CURRENT_DATE:", resNow.rows[0].db_date);

    // Check phieu thu chi associated with it
    const resTC = await pool.query(
      "SELECT * FROM tm_phieu_thu_chi WHERE dien_giai LIKE '%BT00000013%'",
    );
    console.log(
      "Associated Phieu Thu Chi:",
      JSON.stringify(resTC.rows, null, 2),
    );

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
