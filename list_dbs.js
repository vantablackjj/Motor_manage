require("dotenv").config();
const { Pool } = require("pg");

async function listDatabases() {
  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    port: process.env.DB_PORT || 5432,
    database: "postgres", // Connect to default to list others
  });

  try {
    const res = await pool.query(
      "SELECT datname FROM pg_database WHERE datistemplate = false",
    );
    console.log(
      "Databases on this server:",
      res.rows.map((r) => r.datname),
    );
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

listDatabases();
