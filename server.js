require("dotenv").config();
const app = require("./src/app");
const logger = require("./src/ultils/logger");
const { pool } = require("./src/config/database");

const PORT = process.env.PORT || 3000;

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    logger.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  logger.info("✅ Database connected successfully");
  logger.info(`Database time: ${res.rows[0].now}`);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("Process terminated");
    pool.end();
  });
});

module.exports = server;
