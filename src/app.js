const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { swaggerUi, swaggerSpec } = require("./config/swagger");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const cookieParser = require("cookie-parser");

const app = express();
app.set("trust proxy", 1);

// ─── 1. Security middleware (đặt đầu tiên) ───────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Tắt CSP nếu đang dev/test bị chặn, hoặc cấu hình chi tiết sau
  }),
);

// ─── 2. Compression (phải trước routes để nén response) ──────────────────────
app.use(compression());

// ─── 3. Logging (phải trước routes để log mọi request) ───────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );
}

// ─── 4. CORS ─────────────────────────────────────────────────────────────────
// Hỗ trợ nhiều origin (phân cách bởi dấu phẩy trong CORS_ORIGIN)
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  "http://localhost:5173,https://manage-motor-fe-12un.vercel.app,https://jaclyn-uncaged-ecliptically.ngrok-free.dev"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (ví dụ: curl, mobile app, Postman)
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*") ||
        origin.endsWith(".vercel.app") ||
        origin.includes("54.254.173.166"); // Fix cứng IP hiện tại nếu cần hoặc dựa vào allowedOrigins đã update

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked for origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

// ─── 5. Rate Limiting ─────────────────────────────────────────────────────────
// Giới hạn toàn cục: tối đa 200 request/phút mỗi IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút.",
  },
});

// Giới hạn chặt hơn cho login: tối đa 10 lần/15 phút để chống brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Chỉ đếm request thất bại
  message: {
    success: false,
    message: "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.",
  },
});

app.use(globalLimiter);
app.use(`${process.env.API_PREFIX || "/api"}/auth/login`, authLimiter);

// ─── 6. Body parser ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── 7. Health check (public, không qua auth) ────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// ─── 8. API Documentation ─────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── 9. API Routes ────────────────────────────────────────────────────────────
app.use(process.env.API_PREFIX || "/api", routes);

// ─── 10. 404 Handler ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ─── 11. Error Handler ───────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
