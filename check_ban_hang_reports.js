require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkBanHangPermissions() {
  const { rows } = await pool.query(
    "SELECT permissions FROM sys_role WHERE ma_quyen = 'BAN_HANG'",
  );
  if (rows.length > 0) {
    console.log("REPORTS PERMISSIONS:", rows[0].permissions.reports);
  } else {
    console.log("No BAN_HANG role found");
  }
  await pool.end();
}

checkBanHangPermissions();
