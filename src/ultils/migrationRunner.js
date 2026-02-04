/**
 * Migration Runner
 * Executes SQL migration files in order
 */

require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const { pool } = require("../config/database");
const logger = require("../ultils/logger");

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, "../migrations");
  }

  async createMigrationsTable() {
    const sql = `
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

    await pool.query(sql);
    logger.info("Migrations table created/verified");
  }

  async getExecutedMigrations() {
    const result = await pool.query(
      "SELECT migration_name FROM schema_migrations ORDER BY migration_name",
    );
    return result.rows.map((row) => row.migration_name);
  }

  async getMigrationFiles() {
    const files = await fs.readdir(this.migrationsDir);
    return files.filter((f) => f.endsWith(".sql")).sort();
  }

  async executeMigration(filename) {
    const filepath = path.join(this.migrationsDir, filename);
    const sql = await fs.readFile(filepath, "utf8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      logger.info(`Executing migration: ${filename}`);
      await client.query(sql);

      await client.query(
        "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
        [filename],
      );

      await client.query("COMMIT");
      logger.info(`✅ Migration completed: ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`❌ Migration failed: ${filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async run() {
    try {
      logger.info("Starting database migrations...");

      await this.createMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      const pendingMigrations = migrationFiles.filter(
        (file) => !executedMigrations.includes(file),
      );

      if (pendingMigrations.length === 0) {
        logger.info("No pending migrations");
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      logger.info("✅ All migrations completed successfully");
    } catch (error) {
      logger.error("Migration process failed", error);
      throw error;
    }
  }

  async rollback(migrationName) {
    // TODO: Implement rollback functionality
    logger.warn("Rollback not yet implemented");
  }
}

// Run migrations if called directly
if (require.main === module) {
  const runner = new MigrationRunner();
  runner
    .run()
    .then(() => {
      console.log("Migrations completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = MigrationRunner;
