const { pool } = require("./src/config/database");

async function checkColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tm_cong_no_doi_tac'
    `);
    console.log("Columns in tm_cong_no_doi_tac:");
    res.rows.forEach((row) => console.log(`- ${row.column_name}`));

    const res2 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tm_cong_no_noi_bo'
    `);
    console.log("\nColumns in tm_cong_no_noi_bo:");
    res2.rows.forEach((row) => console.log(`- ${row.column_name}`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkColumns();
