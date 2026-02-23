if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = require("./src/app");
const logger = require("./src/ultils/logger");
const { pool } = require("./src/config/database");
const MigrationRunner = require("./src/ultils/migrationRunner");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    logger.info("Starting server...");
    logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

    // Kết nối thử DB
    await pool.query("SELECT NOW()");
    logger.info("✅ Database connected successfully");

    // Tự động chạy Migration trước khi start server
    logger.info("Running migrations...");
    const runner = new MigrationRunner();
    // Chúng ta không gọi runner.run() trực tiếp vì nó đóng pool.end() ở cuối
    // Nên ta copy logic run() nhưng không đóng pool
    await runner.createMigrationsTable();
    const executedMigrations = await runner.getExecutedMigrations();
    const migrationFiles = await runner.getMigrationFiles();
    const pendingMigrations = migrationFiles.filter(
      (file) => !executedMigrations.includes(file),
    );

    if (pendingMigrations.length > 0) {
      logger.info(`Found ${pendingMigrations.length} pending migrations`);
      for (const migration of pendingMigrations) {
        await runner.executeMigration(migration);
      }
      logger.info("✅ All migrations completed successfully");
    } else {
      logger.info("No pending migrations");
    }

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received. Shutting down...");
      server.close(() => pool.end());
    });
  } catch (err) {
    logger.error("❌ Startup failed", err);
    process.exit(1);
  }
}

startServer();
