require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkUsers() {
  try {
    const res = await pool.query("SELECT * FROM sys_user");
    console.log("---USERS---");
    console.table(res.rows);
    console.log("---END---");
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
checkUsers();
