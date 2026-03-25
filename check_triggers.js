require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(`
      SELECT tgname as trigger_name
      FROM pg_trigger
      JOIN pg_class cl ON cl.oid = tgrelid
      WHERE relname = 'dm_ban_nang';
    `);
    console.log("Triggers on dm_ban_nang:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
