const { pool } = require("./src/config/database");

async function diagnose() {
  try {
    const res = await pool.query("SELECT id, ma_kho, so_phieu_tc FROM tm_phieu_thu_chi LIMIT 20");
    console.log("Raw Data:");
    res.rows.forEach(row => {
      console.log(`ID: ${row.id}, MaKho: '${row.ma_kho}' (length: ${row.ma_kho?.length}), SoPhieu: ${row.so_phieu_tc}`);
    });

    const warehouses = ["KHO001", "KHO002"];
    const resAny = await pool.query("SELECT COUNT(*) FROM tm_phieu_thu_chi WHERE ma_kho = ANY($1::text[])", [warehouses]);
    console.log("\nCOUNT with ANY(['KHO001', 'KHO002']):", resAny.rows[0].count);

    const resIn = await pool.query("SELECT COUNT(*) FROM tm_phieu_thu_chi WHERE ma_kho IN ('KHO001', 'KHO002')");
    console.log("COUNT with IN ('KHO001', 'KHO002'):", resIn.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

diagnose();
