require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(
      "SELECT so_phieu_tc, loai_phieu, so_tien, trang_thai, ngay_giao_dich, created_at FROM tm_phieu_thu_chi ORDER BY created_at DESC LIMIT 20",
    );
    console.log("LAST 20 TRANS:");
    res.rows.forEach((r) =>
      console.log(
        `${r.so_phieu_tc} | ${r.loai_phieu} | ${r.so_tien} | ${r.trang_thai} | ${r.ngay_giao_dich}`,
      ),
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
