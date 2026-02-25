require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkFunc() {
  try {
    const res = await pool.query(`
      SELECT 
        p.proname, 
        pg_get_function_arguments(p.oid) as args,
        t.typname as return_type
      FROM pg_proc p
      JOIN pg_type t ON p.prorettype = t.oid
      WHERE p.proname = 'get_nhom_hang_children_v2'
    `);
    console.log("Function info:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkFunc();
