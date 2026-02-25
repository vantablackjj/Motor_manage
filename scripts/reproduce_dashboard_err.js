require("dotenv").config();
const { pool } = require("./src/config/database");

async function testDashboardQuery() {
  const sql = `
    SELECT COUNT(*) as total 
    FROM tm_hang_hoa_ton_kho tk 
    JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa 
    WHERE (pt.ma_nhom_hang NOT IN (SELECT group_code FROM fn_get_all_child_groups('XE'::text)) OR pt.ma_nhom_hang IS NULL) 
    AND tk.so_luong_ton <= tk.so_luong_toi_thieu
  `;
  try {
    const res = await pool.query(sql);
    console.log("Query result:", res.rows[0]);
  } catch (err) {
    console.error("QUERY FAILED:", err.message);
  } finally {
    await pool.end();
  }
}

testDashboardQuery();
