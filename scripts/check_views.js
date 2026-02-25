require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkViews() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    console.log(
      "Views found:",
      res.rows.map((r) => r.table_name),
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkViews();
