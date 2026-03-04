/**
 * Migration Runner
 * Executes SQL migration files in order
 */

require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const { pool } = require("../config/database");
const logger = require("../utils/logger");

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

    // PostgreSQL limitation: ALTER TYPE ... ADD VALUE cannot be used in the same transaction
    // where the new value is referenced. We detect this to skip the manual transaction.
    const useTransaction = !(
      sql.includes("ALTER TYPE") && sql.includes("ADD VALUE")
    );

    const client = await pool.connect();
    try {
      if (useTransaction) {
        await client.query("BEGIN");
      }

      logger.info(
        `Executing migration: ${filename} (Transaction: ${useTransaction})`,
      );

      // Split by semicolon if not using transaction?
      // Actually, pg.query can handle multiple statements in one call,
      // but they run in an implicit transaction.
      // For ALTER TYPE ADD VALUE, we need it to commit.

      // If NOT using transaction, we should run statements one by one or
      // hope that pg handles it. Actually, the best way is to run them one by one.
      if (!useTransaction) {
        // Simple semicolon split (careful with strings/functions, but usually OK for migrations)
        const statements = sql.split(";").filter((st) => st.trim() !== "");
        for (const statement of statements) {
          await client.query(statement);
        }
      } else {
        await client.query(sql);
      }

      if (useTransaction) {
        await client.query(
          "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
          [filename],
        );
        await client.query("COMMIT");
      } else {
        await pool.query(
          "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
          [filename],
        );
      }
      logger.info(`✅ Migration completed: ${filename}`);
    } catch (error) {
      if (useTransaction) {
        await client.query("ROLLBACK");
      }
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
    } finally {
      await pool.end();
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
