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

    // LỰC LƯỢNG CƯỠNG ÉP: Đảm bảo cột ma_kho tồn tại
    // Điều này khắc phục lỗi "column u.ma_kho does not exist" ngay lập tức
    try {
      logger.info("Checking/Fixing sys_user structure...");
      await pool.query(`
        DO $$
        BEGIN
            -- Thêm cột mà không cần REFERENCES để tránh lỗi khóa ngoại nếu bảng sys_kho chưa chuẩn
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_user' AND column_name = 'ma_kho') THEN
                ALTER TABLE sys_user ADD COLUMN ma_kho VARCHAR(50);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sys_user' AND column_name = 'vai_tro') THEN
                ALTER TABLE sys_user ADD COLUMN vai_tro VARCHAR(50);
            END IF;
        END $$;
      `);
      logger.info("✅ sys_user structure verified");
    } catch (dbErr) {
      logger.error("❌ Failed to force update sys_user structure", dbErr);
    }

    // Tự động chạy Migration
    logger.info("Running migrations runner...");
    const runner = new MigrationRunner();
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
