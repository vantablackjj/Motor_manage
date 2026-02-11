require("dotenv").config();
const { pool } = require("./src/config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🚀 Running migration 032: Add Vehicle Approval Workflow...");

    const sqlFile = path.join(
      __dirname,
      "src",
      "migrations",
      "032_add_vehicle_approval.sql",
    );
    const sql = fs.readFileSync(sqlFile, "utf8");

    // Split SQL by semicolon and filter empty statements
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      try {
        await client.query(statement);
      } catch (err) {
        if (
          err.message.includes("already exists") ||
          err.message.includes("is already a member")
        ) {
          console.log("   (Skipped: already exists)");
        } else {
          throw err;
        }
      }
    }

    console.log("✅ Migration 032 completed successfully!");

    // Verify columns added
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tm_hang_hoa_serial' 
        AND column_name IN ('nguoi_gui_duyet', 'ngay_gui_duyet', 'nguoi_duyet', 'ngay_duyet', 'ly_do_tu_choi')
    `);

    console.log("\n📊 Columns added to tm_hang_hoa_serial:");
    result.rows.forEach((row) => {
      console.log(`   ✓ ${row.column_name}`);
    });
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
