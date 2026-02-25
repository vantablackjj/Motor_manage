require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('tm_phu_tung', 'dm_khach_hang', 'dm_doi_tac', 'tm_cong_no_doi_tac', 'tm_cong_no_noi_bo')
      AND column_name IN ('ngay_cap_nhat', 'updated_at')
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
