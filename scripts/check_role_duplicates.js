require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkDuplicates() {
  const { rows } = await pool.query(
    "SELECT ma_quyen, count(*) FROM sys_role GROUP BY ma_quyen HAVING count(*) > 1",
  );
  console.log("Duplicates:", rows);
  await pool.end();
}

checkDuplicates();
