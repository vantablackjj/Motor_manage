require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
  const res = await pool.query(
    "SELECT so_phieu_tc, so_tien, trang_thai, ngay_giao_dich, created_at FROM tm_phieu_thu_chi ORDER BY created_at DESC LIMIT 5",
  );
  console.log("LATEST TRANSACTIONS:", JSON.stringify(res.rows, null, 2));

  const res2 = await pool.query(
    "SELECT NOW() as ict_now, CURRENT_DATE as ict_today",
  );
  console.log("CURRENT ICT:", res2.rows[0]);

  process.exit(0);
}
check();
