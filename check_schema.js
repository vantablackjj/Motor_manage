require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tm_hang_hoa'
      ORDER BY ordinal_position
    `);
    fs.writeFileSync("schema_hang_hoa.json", JSON.stringify(res.rows, null, 2));
    console.log("Saved to schema_hang_hoa.json");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkSchema();
