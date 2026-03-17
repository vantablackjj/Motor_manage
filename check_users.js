require("dotenv").config();
const { pool } = require("./src/config/database");
async function run() {
  try {
    const res = await pool.query("SELECT username, ma_kho FROM sys_user");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
