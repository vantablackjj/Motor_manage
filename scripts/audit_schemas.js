require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");

async function checkSchemas() {
  try {
    const tables = ["tm_don_hang", "tm_hoa_don", "tm_hang_hoa_lich_su"];
    const results = {};

    for (const table of tables) {
      const res = await pool.query(
        `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `,
        [table],
      );
      results[table] = res.rows;
    }

    fs.writeFileSync("schemas_audit.json", JSON.stringify(results, null, 2));
    console.log("Saved to schemas_audit.json");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkSchemas();
