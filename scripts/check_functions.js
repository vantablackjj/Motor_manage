require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkFunctions() {
  try {
    const res = await pool.query(`
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
    `);
    res.rows.forEach((r) => {
      if (
        r.routine_definition &&
        r.routine_definition.includes("ngay_cap_nhat")
      ) {
        console.log(`Found in function: ${r.routine_name}`);
      }
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkFunctions();
