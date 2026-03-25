require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(`SELECT id, ma_ban_nang, ma_kho FROM dm_ban_nang;`);
    console.log("ALL dm_ban_nang:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
