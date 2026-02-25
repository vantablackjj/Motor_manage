require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkProcs() {
  const res = await pool.query(`
    SELECT proname, lanname as lang, pg_get_function_arguments(p.oid) as args
    FROM pg_proc p JOIN pg_language l ON p.prolang = l.oid
    WHERE proname LIKE '%get_nhom_hang_children%' OR proname LIKE '%get_kho_children%'
  `);
  res.rows.forEach((r) => console.log(`${r.proname} (${r.args}) [${r.lang}]`));
  await pool.end();
}
checkProcs();
