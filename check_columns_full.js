require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT column_name
    FROM information_schema.columns 
    WHERE table_name = 'tm_don_hang'
    ORDER BY column_name
  `);
  console.log(
    "Full Columns:",
    JSON.stringify(
      res.rows.map((r) => r.column_name),
      null,
      2,
    ),
  );
  pool.end();
}
run();
