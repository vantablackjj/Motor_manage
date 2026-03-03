require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  const client = await pool.connect();
  try {
    const today = "2026-03-03";
    console.log("TESTING FOR DATE:", today);

    await client.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");

    const res = await client.query(
      "SELECT COUNT(*), SUM(so_tien) FROM tm_phieu_thu_chi WHERE loai_phieu = 'THU' AND trang_thai = 'DA_DUYET' AND ngay_giao_dich::date = $1",
      [today],
    );
    console.log("TRIAL 1 (no warehouse):", res.rows[0]);

    const res2 = await client.query(
      "SELECT COUNT(*), SUM(so_tien) FROM tm_phieu_thu_chi WHERE loai_phieu = 'THU' AND trang_thai = 'DA_DUYET' AND ngay_giao_dich::date = $1 AND ma_kho = $2",
      [today, "KHO001"],
    );
    console.log("TRIAL 2 (KHO001):", res2.rows[0]);

    const all = await client.query(
      "SELECT so_phieu_tc, ngay_giao_dich, ma_kho, trang_thai FROM tm_phieu_thu_chi WHERE loai_phieu = 'THU' ORDER BY created_at DESC LIMIT 5",
    );
    console.log("RAW LAST 5 THU:", all.rows);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}
check();
