require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkBanHangPermissions() {
  const { rows } = await pool.query(
    "SELECT permissions FROM sys_role WHERE ma_quyen = 'BAN_HANG'",
  );
  console.log(JSON.stringify(rows[0]?.permissions, null, 2));
  await pool.end();
}

checkBanHangPermissions();
