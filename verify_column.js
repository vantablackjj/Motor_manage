require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tm_cong_no_doi_tac' AND column_name = 'ma_kho';
    `);
    console.log("Check result:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Check failed:", err);
    process.exit(1);
  }
}

check();
