require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkDebtSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tm_cong_no_doi_tac'
      ORDER BY ordinal_position
    `);
    fs.writeFileSync("schema_debt.json", JSON.stringify(res.rows, null, 2));
    console.log("Saved to schema_debt.json");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkDebtSchema();
