require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'ma_kho'
      AND table_name IN ('tm_cong_no_doi_tac', 'tm_cong_no_doi_tac_ct', 'tm_phieu_thu_chi', 'tm_bao_tri', 'tm_don_hang', 'tm_hoa_don');
    `);
    console.log("Check result:", JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Check failed:", err);
    process.exit(1);
  }
}

check();
