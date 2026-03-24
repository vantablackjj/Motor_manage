const { pool } = require("./src/config/database");
const fs = require('fs');

async function diagnose() {
  let output = "";
  try {
    const res = await pool.query("SELECT id, ma_kho, so_phieu_tc FROM tm_phieu_thu_chi LIMIT 20");
    output += "Raw Data:\n";
    res.rows.forEach(row => {
      output += `ID: ${row.id}, MaKho: '${row.ma_kho}' (length: ${row.ma_kho?.length}), SoPhieu: ${row.so_phieu_tc}\n`;
    });

    const warehouses = ["KHO001", "KHO002"];
    const resAny = await pool.query("SELECT COUNT(*) FROM tm_phieu_thu_chi WHERE ma_kho = ANY($1::text[])", [warehouses]);
    output += `\nCOUNT with ANY(['KHO001', 'KHO002']): ${resAny.rows[0].count}\n`;

    const resIn = await pool.query("SELECT COUNT(*) FROM tm_phieu_thu_chi WHERE ma_kho IN ('KHO001', 'KHO002')");
    output += `COUNT with IN ('KHO001', 'KHO002'): ${resIn.rows[0].count}\n`;

  } catch (err) {
    output += "ERROR: " + err.message + "\n" + err.stack;
  } finally {
    fs.writeFileSync('diag_output.txt', output);
    await pool.end();
    process.exit(0);
  }
}

diagnose();
