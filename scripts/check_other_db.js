require("dotenv").config();
const { Pool } = require("pg");

async function checkOtherDB() {
  const p = new Pool({
    host: "localhost",
    user: "postgres",
    password: "password",
    port: 5432,
    database: "manage_motor",
  });

  try {
    const res = await p.query(`
      SELECT proname FROM pg_proc WHERE proname LIKE 'fn_%'
    `);
    console.log(
      "Functions in manage_motor:",
      res.rows.map((r) => r.proname),
    );
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await p.end();
  }
}

checkOtherDB();
