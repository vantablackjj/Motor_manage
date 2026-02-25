require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkKHO() {
  const { rows } = await pool.query(
    "SELECT permissions FROM sys_role WHERE ma_quyen = 'KHO'",
  );
  if (rows.length > 0) {
    console.log(
      "KHO Reports Permissions:",
      JSON.stringify(rows[0].permissions.reports, null, 2),
    );
  } else {
    console.log("KHO role not found");
  }
  await pool.end();
}

checkKHO();
