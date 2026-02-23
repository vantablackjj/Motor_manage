require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkKhoColumns() {
  const { rows } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'sys_kho'",
  );
  console.log(
    "Columns in sys_kho:",
    rows.map((r) => r.column_name),
  );
  await pool.end();
}

checkKhoColumns();
