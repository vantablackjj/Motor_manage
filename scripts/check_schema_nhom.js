require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'dm_nhom_hang'
      ORDER BY ordinal_position
    `);
    fs.writeFileSync(
      "schema_nhom_hang.json",
      JSON.stringify(res.rows, null, 2),
    );
    console.log("Saved to schema_nhom_hang.json");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkSchema();
