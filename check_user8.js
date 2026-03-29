const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./src/config/database');

async function check_user8() {
  try {
    const res = await pool.query("SELECT id, username, vai_tro, ma_kho FROM sys_user WHERE id = 8");
    console.log('User 8:', JSON.stringify(res.rows[0], null, 2));
    
    const k_assigned = await pool.query("SELECT ma_kho FROM sys_user_kho WHERE user_id = 8");
    console.log('Assignments:', k_assigned.rows.map(r => r.ma_kho));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check_user8();
