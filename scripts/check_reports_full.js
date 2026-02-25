require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkBanHangPermissions() {
  const { rows } = await pool.query(
    "SELECT permissions FROM sys_role WHERE ma_quyen = 'BAN_HANG'",
  );
  if (rows.length > 0) {
    const reports = rows[0].permissions.reports;
    fs.writeFileSync("ban_hang_reports.json", JSON.stringify(reports, null, 2));
    console.log("Written to ban_hang_reports.json");
  } else {
    console.log("No BAN_HANG role found");
  }
  await pool.end();
}

checkBanHangPermissions();
