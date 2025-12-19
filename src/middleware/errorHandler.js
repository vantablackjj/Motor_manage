const logger = require("../ultils/logger");
const { sendError } = require("../ultils/respone");

const errorHandler = (err, req, res, next) => {
  logger.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id,
  });

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case "23505": // Unique violation
        return sendError(res, "Duplicate entry", 409, {
          field: err.constraint,
        });
      case "23503": // Foreign key violation
        return sendError(res, "Referenced record not found", 400);
      case "23502": // Not null violation
        return sendError(res, "Required field missing", 400);
      default:
        return sendError(res, "Database error", 500);
    }
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  sendError(res, message, statusCode, {
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
