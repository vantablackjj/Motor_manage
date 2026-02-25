require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkPhuTung() {
  try {
    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tm_phu_tung'
      );
    `);
    console.log("tm_phu_tung exists:", res.rows[0].exists);

    if (res.rows[0].exists) {
      const cols = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tm_phu_tung'
        AND column_name IN ('ngay_cap_nhat', 'updated_at')
      `);
      console.log("Columns:", cols.rows);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkPhuTung();
