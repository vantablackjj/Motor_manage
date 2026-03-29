const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./src/config/database');

async function check_users() {
  try {
    const res = await pool.query("SELECT id, username, ho_ten, vai_tro, ma_kho FROM sys_user");
    console.log('Users:', JSON.stringify(res.rows, null, 2));
    
    const roles = await pool.query("SELECT * FROM sys_role");
     console.log('Roles:', JSON.stringify(roles.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check_users();
