require("dotenv").config();
const { pool } = require("./src/config/database");

async function dropConstraint() {
  try {
    const client = await pool.connect();
    console.log("Connected to DB...");
    await client.query(
      `ALTER TABLE tm_cong_no_doi_tac_ct DROP CONSTRAINT IF EXISTS fk_cong_no_dt_ct_hoa_don;`,
    );
    console.log("Dropped fk_cong_no_dt_ct_hoa_don constraint.");

    // Attempt another name just in case
    await client.query(
      `ALTER TABLE tm_cong_no_doi_tac_ct DROP CONSTRAINT IF EXISTS tm_cong_no_doi_tac_ct_so_hoa_don_fkey;`,
    );
    console.log("Dropped tm_cong_no_doi_tac_ct_so_hoa_don_fkey constraint.");

    client.release();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

dropConstraint();
