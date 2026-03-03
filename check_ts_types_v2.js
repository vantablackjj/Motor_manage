require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('tm_phieu_thu_chi', 'tm_hoa_don', 'tm_bao_tri')
          AND column_name IN ('ngay_giao_dich', 'ngay_hoa_don', 'thoi_gian_ket_thuc', 'created_at')
    `);
    res.rows.forEach((r) =>
      console.log(`${r.table_name}.${r.column_name}: ${r.data_type}`),
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
