const jwt = require("jsonwebtoken");
const { sendError } = require("../ultils/respone");
const User = require("../models/User");
const logger = require("../ultils/logger");

/**
 * Middleware xác thực JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, "Access token required", 401);
    }

    // Format: "Bearer TOKEN"
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return sendError(
        res,
        "Token format invalid. Format: Bearer [token]",
        401,
      );
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lấy thông tin user từ DB (để chắc chắn user còn active)
    const user = await User.getById(decoded.id);

    if (!user) {
      return sendError(res, "User not found or deactivated", 401);
    }

    // Gắn thông tin user vào request
    req.user = {
      id: user.id,
      username: user.username,
      ho_ten: user.ho_ten,
      vai_tro: user.vai_tro,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, "Token expired", 401, {
        error_code: "TOKEN_EXPIRED",
        expired_at: error.expiredAt,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return sendError(res, "Invalid token", 401, {
        error_code: "INVALID_TOKEN",
      });
    }

    logger.error("Authentication error:", error);
    return sendError(res, "Authentication failed", 500);
  }
};

/**
 * Middleware xác thực optional (không bắt buộc đăng nhập)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = null;
      return next();
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      req.user = null;
      return next();
    }

    const token = parts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.getById(decoded.id);

    req.user = user
      ? {
          id: user.id,
          username: user.username,
          vai_tro: user.vai_tro,
        }
      : null;

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    vai_tro: user.vai_tro,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    issuer: "warehouse-api",
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    type: "refresh",
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    issuer: "warehouse-api",
  });
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Middleware phân quyền (role-based access control)
 * @param {string[]} allowedRoles - Danh sách các vai trò được phép truy cập
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Unauthorized", 401);
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.vai_tro)) {
      return sendError(res, "Insufficient permissions", 403, {
        required_roles: allowedRoles,
        your_role: req.user.vai_tro,
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
};
