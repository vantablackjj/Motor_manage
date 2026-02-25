require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkRoles() {
  const { rows } = await pool.query("SELECT ma_quyen, ten_quyen FROM sys_role");
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}

checkRoles();
