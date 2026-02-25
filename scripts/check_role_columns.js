require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkRoleColumns() {
  const { rows } = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'sys_role'",
  );
  fs.writeFileSync(
    "sys_role_columns.json",
    JSON.stringify(
      rows.map((r) => r.column_name),
      null,
      2,
    ),
  );
  console.log("Written to sys_role_columns.json");
  await pool.end();
}

checkRoleColumns();
