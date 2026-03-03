require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(
      "SELECT * FROM tm_phieu_thu_chi WHERE so_phieu_tc = 'PT20260303000005'",
    );
    console.log("SEARCH RESULT:", JSON.stringify(res.rows, null, 2));

    if (res.rows.length === 0) {
      console.log("Transaction not found. Checking all March transactions...");
      const res2 = await pool.query(
        "SELECT so_phieu_tc, ngay_giao_dich, created_at FROM tm_phieu_thu_chi WHERE created_at >= '2026-03-01' OR ngay_giao_dich >= '2026-03-01'",
      );
      console.log("ALL MARCH:", JSON.stringify(res2.rows, null, 2));
    }

    const dbInfo = await pool.query(
      "SELECT current_database(), current_user, inet_server_addr()",
    );
    console.log("DB INFO:", dbInfo.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
