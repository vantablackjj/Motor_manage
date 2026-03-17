require("dotenv").config();
const { pool } = require("./src/config/database");
async function run() {
  try {
    const res = await pool.query(
      "SELECT count(*) FROM tm_phieu_thu_chi WHERE ma_kho = 'KHO01'",
    );
    console.log("Total records for KHO01:", res.rows[0].count);

    const res2 = await pool.query("SELECT count(*) FROM tm_phieu_thu_chi");
    console.log("Total records in system:", res2.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
