const { pool } = require('./src/config/database');
async function check() {
  const tables = ['tm_don_hang', 'tm_hoa_don'];
  for (const table of tables) {
    console.log(`Checking ${table}...`);
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}'`);
    console.log(res.rows);
  }
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
