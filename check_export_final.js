require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  const { rows } = await pool.query(
    "SELECT id, ma_quyen, ten_quyen, permissions FROM sys_role",
  );
  rows.forEach((r) => {
    const exportPerm = r.permissions?.reports?.export;
    console.log(
      `Role: ${r.ten_quyen} (${r.ma_quyen}) -> reports.export: ${exportPerm}`,
    );
  });
  await pool.end();
}

check();
