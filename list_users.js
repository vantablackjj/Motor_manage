require("dotenv").config();
const { pool } = require("./src/config/database");

async function listUsers() {
  const { rows } = await pool.query(
    "SELECT username, vai_tro, role_id FROM sys_user",
  );
  console.log(rows);
  await pool.end();
}

listUsers();
