require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  await pool.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
  const res = await pool.query(
    "SELECT so_phieu_tc, so_tien, trang_thai, ngay_giao_dich, created_at, noi_dung FROM tm_phieu_thu_chi WHERE created_at >= '2026-03-01' ORDER BY created_at DESC",
  );
  console.log("MARCH TRANSACTIONS:", JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
check();
