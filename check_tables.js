require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkTables() {
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  );
  console.log(
    "Tables:",
    rows.map((r) => r.table_name),
  );
  await pool.end();
}

checkTables();
