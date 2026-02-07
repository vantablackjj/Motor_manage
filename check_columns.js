require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkDB() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tm_cong_no_doi_tac' 
      AND column_name IN ('ngay_cap_nhat', 'updated_at')
    `);
    console.log(
      "Found columns:",
      res.rows.map((r) => r.column_name),
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
