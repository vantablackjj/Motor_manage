require("dotenv").config();
const { pool } = require("./src/config/database");

async function checkSchema() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT NOW() as db_now");
    console.log("DB Time:", res.rows[0].db_now);

    const res2 = await client.query(
      "SELECT * FROM tm_bao_tri ORDER BY created_at DESC LIMIT 5",
    );
    console.log("Latest Maintenance Tickets:", res2.rows);

    const res3 = await client.query(
      "SELECT * FROM tm_phieu_thu_chi ORDER BY created_at DESC LIMIT 5",
    );
    console.log("Latest Cash Flow Receipts:", res3.rows);

    client.release();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
