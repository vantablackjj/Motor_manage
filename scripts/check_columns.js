require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkColumns() {
  const { rows } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'sys_user'",
  );
  console.log(
    "Columns in sys_user:",
    rows.map((r) => r.column_name),
  );
  await pool.end();
}

checkColumns();
