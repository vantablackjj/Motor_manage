require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Adding metadata column to tm_phieu_thu_chi...");

    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE tm_phieu_thu_chi 
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);

    await client.query("COMMIT");
    console.log("✅ Migration successful");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
