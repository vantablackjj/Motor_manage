require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkTriggers() {
  try {
    const res = await pool.query(`
      SELECT 
          event_object_table AS table_name,
          trigger_name,
          action_statement AS definition
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkTriggers();
