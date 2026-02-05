const { pool } = require("./src/config/database");

async function check() {
  try {
    console.log("--- tm_cong_no_doi_tac ---");
    const res = await pool.query("SELECT * FROM tm_cong_no_doi_tac");
    console.table(res.rows);

    console.log("--- tm_cong_no_doi_tac_ct (first 5) ---");
    const resCt = await pool.query(
      "SELECT * FROM tm_cong_no_doi_tac_ct LIMIT 5",
    );
    console.table(resCt.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

check();
