require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkSchema() {
  try {
    const res = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sys_user'",
    );
    console.log("Columns in sys_user:");
    console.table(res.rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
