require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  const res = await pool.query(
    "SELECT * FROM tm_bao_tri WHERE (tong_tien::numeric = 60000 OR tong_tien::numeric = 60) AND trang_thai = 'HOAN_THANH'",
  );
  console.log("MATCHING BT:", res.rows);

  const res2 = await pool.query(
    "SELECT * FROM tm_phieu_thu_chi WHERE (so_tien::numeric = 60000 OR so_tien::numeric = 60) AND trang_thai = 'DA_DUYET'",
  );
  console.log("MATCHING PT:", res2.rows);

  process.exit(0);
}
check();
