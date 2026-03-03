require("dotenv").config();
const { pool } = require("./src/config/database");

async function run() {
  try {
    const res = await pool.query("SELECT * FROM tm_bao_tri LIMIT 1");
    if (res.rows.length > 0) {
      console.log("Columns in tm_bao_tri:", Object.keys(res.rows[0]));
    } else {
      console.log("tm_bao_tri is empty");
    }

    const res2 = await pool.query("SELECT * FROM tm_phieu_thu_chi LIMIT 1");
    if (res2.rows.length > 0) {
      console.log("Columns in tm_phieu_thu_chi:", Object.keys(res2.rows[0]));
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
