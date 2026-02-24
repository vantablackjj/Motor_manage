require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  const { rows } = await pool.query(
    "SELECT ma_quyen, ten_quyen, permissions->'reports' as reports_perm FROM sys_role",
  );
  rows.forEach((r) => {
    console.log(`Role: ${r.ten_quyen} (${r.ma_quyen})`);
    console.log(`  Reports Perm:`, r.reports_perm);
  });
  await pool.end();
}

check();
