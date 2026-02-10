require("dotenv").config();
const { pool } = require("./src/config/database");

async function finalCheck() {
  try {
    console.log("Final check for get_nhom_hang_children...");
    const res = await pool.query("SELECT * FROM get_nhom_hang_children('XE')");
    console.log("Result:", res.rows.length, "rows");

    console.log("Checking Dashboard Stock query...");
    const res2 = await pool.query(`
      SELECT COUNT(*) as total 
      FROM tm_hang_hoa_ton_kho tk 
      JOIN tm_hang_hoa pt ON tk.ma_hang_hoa = pt.ma_hang_hoa 
      WHERE (pt.ma_nhom_hang NOT IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang IS NULL) 
      AND tk.so_luong_ton <= tk.so_luong_toi_thieu
    `);
    console.log("Low stock PT:", res2.rows[0].total);

    console.log("Checking Dashboard Revenue query...");
    const today = new Date().toISOString().split("T")[0];
    const res3 = await pool.query(
      `SELECT SUM(thanh_tien) as total FROM tm_hoa_don WHERE trang_thai IN ('DA_THANH_TOAN', 'DA_GIAO') AND ngay_hoa_don = $1`,
      [today],
    );
    console.log("Revenue today:", res3.rows[0].total || 0);

    console.log("ALL SYSTEMS GO");
  } catch (err) {
    console.error("FINAL CHECK FAILED:", err.message);
  } finally {
    await pool.end();
  }
}

finalCheck();
