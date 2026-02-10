require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkViews() {
  try {
    const res = await pool.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE definition ILIKE '%get_nhom_hang_children%' 
         OR definition ILIKE '%get_kho_children%'
    `);
    console.log("Views found:", res.rows);

    const res2 = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_definition ILIKE '%get_nhom_hang_children%' 
         OR routine_definition ILIKE '%get_kho_children%'
      AND routine_name NOT IN ('get_nhom_hang_children', 'get_kho_children')
    `);
    console.log("Other routines found:", res2.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkViews();
