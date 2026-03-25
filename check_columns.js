const { pool } = require("./src/config/database");
require("dotenv").config();

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'tm_cong_no_doi_tac';
    `);
    console.log(res.rows.map(r => r.column_name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
