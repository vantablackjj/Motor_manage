require("dotenv").config();
const { pool } = require("./src/config/database");

async function testAll() {
  const tests = [
    { name: "Simple SELECT", sql: "SELECT 1 as test" },
    { name: "tm_hoa_don SELECT", sql: "SELECT * FROM tm_hoa_don LIMIT 1" },
    {
      name: "get_nhom_hang_children call",
      sql: "SELECT * FROM get_nhom_hang_children('XE') LIMIT 1",
    },
    {
      name: "tonKhoXe query",
      sql: `
      SELECT x.ma_serial 
      FROM tm_hang_hoa_serial x 
      JOIN tm_hang_hoa pt ON x.ma_hang_hoa = pt.ma_hang_hoa 
      WHERE (pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang = 'XE')
      LIMIT 1
    `,
    },
    {
      name: "doanhThuTheoThang query",
      sql: "SELECT EXTRACT(MONTH FROM ngay_hoa_don) FROM tm_hoa_don LIMIT 1",
    },
  ];

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}...`);
      await pool.query(test.sql);
      console.log(`  [OK] ${test.name}`);
    } catch (err) {
      console.error(`  [FAILED] ${test.name}: ${err.message}`);
    }
  }
  await pool.end();
}

testAll();
