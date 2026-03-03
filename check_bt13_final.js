require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  const res = await pool.query(
    "SELECT ma_phieu, tong_tien, trang_thai, thoi_gian_ket_thuc, updated_at, ma_kho FROM tm_bao_tri WHERE ma_phieu = 'BT00000013'",
  );
  console.log("BT13 STATUS:", JSON.stringify(res.rows, null, 2));

  const res2 = await pool.query(
    "SELECT so_phieu_tc, so_tien, trang_thai, created_at FROM tm_phieu_thu_chi WHERE noi_dung ILIKE '%BT00000013%'",
  );
  console.log("BT13 TRANSACTIONS:", JSON.stringify(res2.rows, null, 2));

  process.exit(0);
}
check();
