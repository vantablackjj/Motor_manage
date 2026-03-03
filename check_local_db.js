// NO dotenv for this one, use manual config to try local
const { Pool } = require("pg");

async function run() {
  const pool = new Pool({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "password",
    database: "Manage_Warehouse",
  });

  try {
    console.log("Checking LOCAL database...");
    const res = await pool.query(
      "SELECT ma_phieu, trang_thai, created_at FROM tm_bao_tri ORDER BY created_at DESC LIMIT 5",
    );
    console.log(
      "Local Maintenance Tickets:",
      JSON.stringify(res.rows, null, 2),
    );

    const resRev = await pool.query(
      "SELECT SUM(tong_tien) as total FROM tm_bao_tri WHERE trang_thai = 'HOAN_THANH'",
    );
    console.log(
      "Total Local Completed Maintenance Revenue (All time):",
      resRev.rows[0].total,
    );

    process.exit(0);
  } catch (err) {
    console.error("Local DB Connection failed:", err.message);
    process.exit(1);
  }
}

run();
