require("dotenv").config();
const { pool } = require("./src/config/database");

async function listAll() {
  const { rows } = await pool.query(
    "SELECT id, ma_quyen, ten_quyen, permissions FROM sys_role",
  );
  const fs = require("fs");
  fs.writeFileSync("all_roles_perms.json", JSON.stringify(rows, null, 2));
  console.log("Written to all_roles_perms.json");
  await pool.end();
}

listAll();
