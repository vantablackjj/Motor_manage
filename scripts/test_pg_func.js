require("dotenv").config();
const { pool } = require("./src/config/database");

async function testFunction() {
  try {
    console.log("Testing get_nhom_hang_children...");
    const res = await pool.query(
      "SELECT * FROM get_nhom_hang_children('XE') LIMIT 5",
    );
    console.log("Result:", res.rows);
  } catch (err) {
    console.error("Error detail:", err);
  } finally {
    await pool.end();
  }
}

testFunction();
