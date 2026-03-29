const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./src/config/database');

async function check_roles() {
  try {
    const res = await pool.query("SELECT * FROM sys_role LIMIT 1");
    console.log('Role schema:', Object.keys(res.rows[0]));
    console.log('Full row:', JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check_roles();
