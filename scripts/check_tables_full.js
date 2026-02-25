require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkTables() {
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  );
  fs.writeFileSync(
    "tables.json",
    JSON.stringify(
      rows.map((r) => r.table_name),
      null,
      2,
    ),
  );
  console.log("Written to tables.json");
  await pool.end();
}

checkTables();
