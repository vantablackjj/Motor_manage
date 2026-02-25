require("dotenv").config();
const { pool } = require("./src/config/database");

async function listRoles() {
  const { rows } = await pool.query(
    "SELECT id, ma_quyen, ten_quyen FROM sys_role",
  );
  console.log("Roles in sys_role:", rows);
  await pool.end();
}

listRoles();
