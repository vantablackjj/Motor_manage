require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkHistory() {
  try {
    console.log("=== Checking tm_hang_hoa_lich_su ===");
    const historyRes = await pool.query(`
      SELECT COUNT(*) as count FROM tm_hang_hoa_lich_su 
      WHERE ngay_giao_dich >= '2026-02-01' AND ngay_giao_dich <= '2026-02-10'
    `);
    console.log(`Total history records: ${historyRes.rows[0].count}`);

    const historyDetailRes = await pool.query(`
      SELECT loai_giao_dich, COUNT(*) as count FROM tm_hang_hoa_lich_su 
      WHERE ngay_giao_dich >= '2026-02-01' AND ngay_giao_dich <= '2026-02-10'
      GROUP BY loai_giao_dich
    `);
    console.log("By transaction type:");
    historyDetailRes.rows.forEach((r) =>
      console.log(`  ${r.loai_giao_dich}: ${r.count}`),
    );

    console.log("\n=== Checking tm_don_hang (Purchase Orders) ===");
    const poRes = await pool.query(`
      SELECT COUNT(*) as count FROM tm_don_hang 
      WHERE loai_don_hang = 'MUA_HANG' 
      AND ngay_dat_hang >= '2026-02-01' AND ngay_dat_hang <= '2026-02-10'
      AND trang_thai = 'HOAN_THANH'
    `);
    console.log(`Completed purchase orders: ${poRes.rows[0].count}`);

    console.log("\n=== Checking tm_hang_hoa_serial (Vehicles) ===");
    const serialRes = await pool.query(`
      SELECT COUNT(*) as count FROM tm_hang_hoa_serial 
      WHERE ngay_nhap_kho >= '2026-02-01' AND ngay_nhap_kho <= '2026-02-10'
    `);
    console.log(`Vehicles received: ${serialRes.rows[0].count}`);

    // Check if vehicles are in XE group
    console.log("\n=== Checking vehicle group ===");
    const xeGroupRes = await pool.query(`
      SELECT COUNT(*) as count FROM tm_hang_hoa_serial s
      JOIN tm_hang_hoa h ON s.ma_hang_hoa = h.ma_hang_hoa
      WHERE s.ngay_nhap_kho >= '2026-02-01' AND s.ngay_nhap_kho <= '2026-02-10'
      AND (h.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR h.ma_nhom_hang = 'XE')
    `);
    console.log(`Vehicles in XE group: ${xeGroupRes.rows[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkHistory();
