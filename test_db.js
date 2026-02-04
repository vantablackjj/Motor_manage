require("dotenv").config();
const { pool } = require("./src/config/database");

async function testConnection() {
  try {
    console.log("Connecting to:", process.env.DB_NAME);
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    console.log("Connection successful!");
    console.log("Tables found:", res.rowCount);
    res.rows.forEach((row) => console.log(" -", row.table_name));
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
