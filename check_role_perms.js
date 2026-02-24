require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkPermissions() {
  const { rows } = await pool.query(
    "SELECT id, ma_quyen, ten_quyen, permissions FROM sys_role",
  );
  rows.forEach((r) => {
    console.log(`Role: ${r.ten_quyen} (${r.ma_quyen})`);
    console.log(
      "Reports Permissions:",
      JSON.stringify(r.permissions?.reports, null, 2),
    );
    console.log("-------------------");
  });
  await pool.end();
}

checkPermissions();
