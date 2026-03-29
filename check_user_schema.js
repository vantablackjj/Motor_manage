const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./src/config/database');

async function check_user_schema() {
  try {
    const res = await pool.query("SELECT * FROM sys_user LIMIT 1");
    console.log('User schema:', Object.keys(res.rows[0]));
    console.log('Full row:', JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check_user_schema();
