const { pool } = require("../config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🚀 Running migration 021: Cash Fund Management...");

    const sqlFile = path.join(__dirname, "021_create_cash_fund_management.sql");
    const sql = fs.readFileSync(sqlFile, "utf8");

    await client.query(sql);

    console.log("✅ Migration 021 completed successfully!");

    // Verify tables created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('tm_quy_tien_mat', 'tm_lich_su_quy')
      ORDER BY table_name
    `);

    console.log("\n📊 Tables created:");
    result.rows.forEach((row) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check funds created
    const funds = await client.query(`
      SELECT ma_kho, loai_quy, ten_quy, so_du_hien_tai
      FROM tm_quy_tien_mat
      ORDER BY ma_kho, loai_quy
    `);

    console.log(`\n💰 Created ${funds.rowCount} default funds:`);
    funds.rows.forEach((fund) => {
      console.log(
        `   ✓ ${fund.ma_kho} - ${fund.ten_quy} (${fund.loai_quy}): ${fund.so_du_hien_tai}`,
      );
    });
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
