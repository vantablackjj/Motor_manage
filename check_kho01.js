require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(`SELECT ma_kho, ten_kho, status FROM sys_kho WHERE ma_kho = 'KHO01';`);
    console.log("KHO01 status:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
