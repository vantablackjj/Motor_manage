require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkProcs() {
  try {
    const res = await pool.query(`
      SELECT 
        p.oid,
        n.nspname as schema,
        p.proname as name,
        pg_get_function_arguments(p.oid) as args,
        l.lanname as language
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE p.proname LIKE '%get_nhom_hang_children%'
         OR p.proname LIKE '%get_kho_children%'
    `);
    console.log("Found functions:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkProcs();
