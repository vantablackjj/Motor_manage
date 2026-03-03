require("dotenv").config();
const { pool } = require("./src/config/database");

async function check() {
  try {
    const tables = ["tm_hoa_don", "tm_don_hang", "tm_bao_tri"];
    for (const table of tables) {
      const res = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [table],
      );
      const cols = res.rows.map((r) => r.column_name);
      console.log(`Table: ${table}`);
      console.log(`Has ID: ${cols.includes("id")}`);
      console.log(`Columns: ${cols.join(", ")}`);
      console.log("---");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
