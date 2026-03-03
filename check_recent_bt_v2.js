require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
  const res = await pool.query(
    "SELECT ma_phieu, tong_tien, trang_thai, thoi_gian_ket_thuc, updated_at FROM tm_bao_tri ORDER BY updated_at DESC LIMIT 10",
  );
  console.log("RECENT MAINTENANCE:", JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
check();
