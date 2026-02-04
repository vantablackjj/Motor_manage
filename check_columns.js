require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tm_don_hang'
    `);
    console.log(
      "Columns:",
      res.rows.map((r) => r.column_name),
    );
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
