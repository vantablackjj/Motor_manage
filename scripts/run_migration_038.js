require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, "src", "migrations", "038_create_sys_user_kho.sql"),
    "utf-8",
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Migration 038 completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration 038 failed:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
