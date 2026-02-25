require("dotenv").config();
const { pool } = require("./src/config/database");

async function testV2() {
  try {
    const sql = "SELECT * FROM get_nhom_hang_children_v2('XE') LIMIT 5";
    const res = await pool.query(sql);
    console.log("Result rows:", res.rows);
    console.log("Column names:", Object.keys(res.rows[0] || {}));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

testV2();
