const { pool } = require("./src/config/database");

async function checkDebt() {
  try {
    console.log("--- Internal Debt Summary ---");
    const summary = await pool.query("SELECT * FROM tm_cong_no_noi_bo");
    console.table(summary.rows);

    console.log("\n--- Internal Debt Details (top 10) ---");
    const details = await pool.query(`
            SELECT ct.*, o.loai_don_hang 
            FROM tm_cong_no_noi_bo_ct ct
            LEFT JOIN tm_don_hang o ON ct.so_phieu_chuyen_kho = o.so_don_hang
            LIMIT 10
        `);
    console.table(details.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkDebt();
