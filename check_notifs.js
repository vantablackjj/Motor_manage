const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./src/config/database');

async function check_notifications() {
  try {
    const res = await pool.query("SELECT * FROM tm_notifications ORDER BY created_at DESC LIMIT 5");
    console.log('Recent notifications:', JSON.stringify(res.rows, null, 2));
    
    const count = await pool.query("SELECT count(*) FROM tm_notifications");
    console.log('Total notifications:', count.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check_notifications();
