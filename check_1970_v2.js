const fs = require("fs");
const { Pool } = require("pg");
const pool = new Pool({
  connectionString:
    "postgresql://postgres:password@localhost:5432/Manage_Warehouse",
});

async function check() {
  try {
    const res = await pool.query(
      "SELECT id, ngay_du_kien FROM tm_nhac_nho_bao_duong ORDER BY id DESC",
    );
    fs.writeFileSync("reminders_check.json", JSON.stringify(res.rows, null, 2));
    console.log("Total rows:", res.rows.length);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
