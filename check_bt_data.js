require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query(
      "SELECT ma_phieu, trang_thai, thoi_gian_ket_thuc, created_at FROM tm_bao_tri WHERE ma_phieu = 'BT00000013'",
    );
    console.log(JSON.stringify(res.rows, null, 2));

    const res2 = await pool.query("SELECT NOW() as now");
    console.log("DB NOW:", res2.rows[0].now);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
