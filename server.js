if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const http = require("http");
const { Server } = require("socket.io");
const app = require("./src/app");
const logger = require("./src/utils/logger");
const { pool } = require("./src/config/database");
const MigrationRunner = require("./src/utils/migrationRunner");
const NotificationService = require("./src/services/notification.service");
const PushNotificationService = require("./src/services/pushNotification.service");
const MaintenanceService = require("./src/services/MaintenanceService");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    logger.info("Starting server...");
    logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

    // Kết nối thử DB
    await pool.query("SELECT NOW()");
    logger.info("✅ Database connected successfully");

    // Khởi tạo VAPID cho Web Push Notifications
    PushNotificationService.init();

    // LỰC LƯỢNG CƯỠNG ÉP: Đảm bảo cột ma_kho tồn tại
    try {
      logger.info("Checking/Fixing sys_user structure...");
      await pool.query(`
        DO $$
        BEGIN
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

    // Initialize HTTP Server and Socket.io
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
        credentials: true,
      },
    });

    NotificationService.setIo(io);

    io.on("connection", (socket) => {
      logger.info(`🔌 New client connected: ${socket.id}`);

      socket.on("join", (user_id) => {
        if (user_id) {
          socket.join(`user_${user_id}`);
          logger.info(`👤 User ${user_id} joined their private room`);
        }
      });

      socket.on("disconnect", () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);

      // Chạy trình nhắc nhở mỗi 24 giờ
      setInterval(
        async () => {
          try {
            logger.info("Auto-triggering daily maintenance reminders...");
            await MaintenanceService.runDailyReminders();
          } catch (err) {
            logger.error("Error in daily reminder scheduler:", err);
          }
        },
        24 * 60 * 60 * 1000,
      );

      // Chạy lần đầu sau khi start 1 phút để tránh overload lúc khởi động
      setTimeout(async () => {
        try {
          await MaintenanceService.runDailyReminders();
        } catch (err) {
          logger.error("Error in initial reminder trigger:", err);
        }
      }, 60 * 1000);
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
