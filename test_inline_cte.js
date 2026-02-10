require("dotenv").config();
const { pool } = require("./src/config/database");

async function testInlineCTE() {
  const sql = `
    SELECT COUNT(*) as total 
    FROM tm_hang_hoa_ton_kho tk 
    JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa 
    WHERE (pt.ma_nhom_hang NOT IN (
        WITH RECURSIVE nhom_tree AS (
          SELECT ma_nhom FROM dm_nhom_hang WHERE ma_nhom = 'XE'
          UNION ALL
          SELECT n.ma_nhom FROM dm_nhom_hang n INNER JOIN nhom_tree nt ON n.ma_nhom_cha = nt.ma_nhom
        ) SELECT ma_nhom FROM nhom_tree
      ) OR pt.ma_nhom_hang IS NULL) 
    AND tk.so_luong_ton <= tk.so_luong_toi_thieu
  `;
  try {
    const res = await pool.query(sql);
    console.log("Success! Count:", res.rows[0].total);
  } catch (err) {
    console.error("FAILED:", err.message);
  } finally {
    await pool.end();
  }
}

testInlineCTE();
