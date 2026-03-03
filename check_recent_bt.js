require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query(
      "SELECT ma_phieu, trang_thai, thoi_gian_ket_thuc, created_at, updated_at FROM tm_bao_tri ORDER BY updated_at DESC LIMIT 10",
    );
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
