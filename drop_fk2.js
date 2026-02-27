require("dotenv").config();
const { pool } = require("./src/config/database");

async function dropConstraint() {
  const client = await pool.connect();
  try {
    console.log("DB URL:", process.env.DATABASE_URL);
    const { rows } = await client.query(`
      SELECT tc.constraint_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
      WHERE tc.table_name = 'tm_cong_no_doi_tac_ct' 
        AND kcu.column_name = 'so_hoa_don'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);

    console.log(
      "Found constraint names:",
      rows.map((r) => r.constraint_name),
    );

    for (const r of rows) {
      await client.query(
        `ALTER TABLE tm_cong_no_doi_tac_ct DROP CONSTRAINT "${r.constraint_name}"`,
      );
      console.log(`Dropped ${r.constraint_name}`);
    }

    // Now for `tm_phieu_thu_chi` just in case
    const ptcRows = await client.query(`
      SELECT tc.constraint_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
      WHERE tc.table_name = 'tm_phieu_thu_chi' 
        AND kcu.column_name = 'ma_hoa_don'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    console.log(
      "Found PTC constraint names:",
      ptcRows.rows.map((r) => r.constraint_name),
    );

    for (const r of ptcRows.rows) {
      await client.query(
        `ALTER TABLE tm_phieu_thu_chi DROP CONSTRAINT "${r.constraint_name}"`,
      );
      console.log(`Dropped ${r.constraint_name}`);
    }

    client.release();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

dropConstraint();
