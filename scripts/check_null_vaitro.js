require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkNullVaiTro() {
  const { rows } = await pool.query(
    "SELECT u.username, u.role_id, r.ma_quyen FROM sys_user u LEFT JOIN sys_role r ON u.role_id = r.id WHERE u.vai_tro IS NULL",
  );
  console.log("Users with NULL vai_tro:", rows);
  await pool.end();
}

checkNullVaiTro();
