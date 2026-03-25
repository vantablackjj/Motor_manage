require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(`
      SELECT ma_ban_nang, ma_kho, COUNT(*) 
      FROM dm_ban_nang 
      GROUP BY ma_ban_nang, ma_kho 
      HAVING COUNT(*) > 1;
    `);
    console.log("Duplicates found:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
