if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const http = require("http");
const cron = require("node-cron");
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
    // Tăng timeout cho các tác vụ import lớn
    server.timeout = 10 * 60 * 1000;
    server.keepAliveTimeout = 65 * 1000;

    const io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(o => o.trim());
          const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes("*") || origin.endsWith(".vercel.app");
          if (isAllowed) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        },
        methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
        credentials: true,
      },
    });

    NotificationService.setIo(io);

    io.on("connection", (socket) => {
      logger.info(` New client connected: ${socket.id}`);
      socket.on("join", (user_id) => {
        if (user_id) {
          socket.join(`user_${user_id}`);
          logger.info(` User ${user_id} joined their private room`);
        }
      });
      socket.on("disconnect", () => {
        logger.info(` Client disconnected: ${socket.id}`);
      });
    });

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);

      // Chạy trình nhắc nhở mỗi ngày lúc 08:00 sáng
      cron.schedule("0 8 * * *", async () => {
        try {
          logger.info("Cron trigger: Running daily maintenance reminders...");
          await MaintenanceService.runDailyReminders();
        } catch (err) {
          logger.error("Error in cron reminder task:", err);
        }
      });

      // Chạy lần đầu sau khi start 30 giây để đảm bảo DB đã sẵn sàng hoàn toàn
      setTimeout(async () => {
        try {
          logger.info("Initial check: Running maintenance reminders check...");
          await MaintenanceService.runDailyReminders();
        } catch (err) {
          logger.error("Error in initial reminder check:", err);
        }
      }, 30000);
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
