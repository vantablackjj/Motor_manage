const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { validate } = require("../middleware/validation");
const { authenticate } = require("../middleware/auth");
const { checkRole, checkPermission } = require("../middleware/roleCheck");
const { sendSuccess, sendError } = require("../utils/response");
const User = require("../services/user.service");
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../middleware/auth");
const { query } = require("../config/database");
const Joi = require("joi");
const { ROLES } = require("../config/constants");
const logger = require("../utils/logger");

// ============================================================
// REFRESH TOKEN HELPERS (lưu/kiểm tra/thu hồi token trong DB)
// ============================================================

/** Lưu refresh token vào DB (lưu hash SHA-256, không lưu plain text) */
const saveRefreshToken = async (userId, token, req) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 ngày
  );
  await query(
    `INSERT INTO sys_refresh_token (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, req.headers["user-agent"] || null, req.ip],
  );
  return tokenHash;
};

/** Kiểm tra refresh token có hợp lệ (tồn tại, chưa revoked, chưa hết hạn) */
const validateRefreshTokenInDB = async (token) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await query(
    `SELECT * FROM sys_refresh_token
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()`,
    [tokenHash],
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

/** Thu hồi refresh token khi logout */
const revokeRefreshToken = async (token) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await query(
    `UPDATE sys_refresh_token SET revoked_at = NOW() WHERE token_hash = $1`,
    [tokenHash],
  );
};

/** Thu hồi tất cả refresh token của 1 user (đổi mật khẩu, deactivate) */
const revokeAllUserTokens = async (userId) => {
  await query(
    `UPDATE sys_refresh_token SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
};

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(100),
  password: Joi.string().required().min(6),
});

const registerSchema = Joi.object({
  username: Joi.string().required().min(3).max(100),
  password: Joi.string().required().min(6).max(50),
  ho_ten: Joi.string().required().max(200),
  email: Joi.string().email().allow("", null),
  dien_thoai: Joi.string().max(50).allow("", null),
  role_id: Joi.number().integer().required(),
});

const changePasswordSchema = Joi.object({
  old_password: Joi.string().required().min(6),
  new_password: Joi.string().required().min(6).max(50),
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().optional(),
});

const assignWarehouseSchema = Joi.object({
  ma_kho: Joi.string().required().max(50),
  quyen_xem: Joi.boolean().default(true),
  quyen_them: Joi.boolean().default(false),
  quyen_sua: Joi.boolean().default(false),
  quyen_xoa: Joi.boolean().default(false),
  quyen_chuyen_kho: Joi.boolean().default(false),
});

// ============================================================
// ROUTES
// ============================================================

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 */
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password?.trim();
    // Tìm user
    const user = await User.getByUsername(username);
    if (!user) {
      logger.warn(`Login failed: User not found - ${username}`);
      return sendError(res, "Tên đăng nhập hoặc mật khẩu không đúng", 401);
    }

    // Kiểm tra tài khoản có bị deactivate không
    if (user.status === false || user.status === "false") {
      logger.warn(`Login failed: Account deactivated - ${username}`);
      return sendError(res, "Tài khoản đã bị vô hiệu hóa", 403);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      logger.warn(`Login failed: Wrong password - ${username}`);
      return sendError(res, "Tên đăng nhập hoặc mật khẩu không đúng", 401);
    }

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Lưu refresh token vào DB để hỗ trợ revoke khi logout
    try {
      await saveRefreshToken(user.id, refreshToken, req);
    } catch (tokenErr) {
      // Nếu bảng chưa tồn tại (migration chưa chạy) thì bỏ qua, không block login
      logger.warn("Could not save refresh token to DB:", tokenErr.message);
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Remove sensitive data
    delete user.password_hash;

    // Bổ sung: Nếu là ADMIN và permissions bị null, gán full quyền cho FE
    if (user.vai_tro === ROLES.ADMIN && (!user.permissions || Object.keys(user.permissions).length === 0)) {
      const { FULL_ADMIN_PERMISSIONS } = require("../config/constants");
      user.permissions = FULL_ADMIN_PERMISSIONS;
    }

    logger.info(`User logged in successfully: ${username}`);

    // Set refresh token in HTTP-only cookie
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none", // Required for cross-site cookies if FE/BE are on different domains
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    sendSuccess(
      res,
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
        user,
      },
      "Đăng nhập thành công",
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Đăng ký tài khoản mới (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/register",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { username } = req.body;

      // Check username exists
      const existing = await User.getByUsername(username);

      if (existing) {
        return sendError(res, "Tên đăng nhập đã tồn tại", 409);
      }

      // Create user
      const user = await User.create(req.body);

      logger.info(`New user created by ${req.user.username}: ${username}`);

      sendSuccess(res, user, "Đăng ký tài khoản thành công", 201);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  "/refresh",
  validate(refreshTokenSchema),
  async (req, res, next) => {
    try {
      const refresh_token =
        req.cookies?.refresh_token || req.body.refresh_token;

      if (!refresh_token) {
        return sendError(res, "Refresh token is missing", 401);
      }

      // Bước 1: Verify JWT signature và expiry
      let decoded;
      try {
        decoded = verifyRefreshToken(refresh_token);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return sendError(
            res,
            "Refresh token đã hết hạn. Vui lòng đăng nhập lại",
            401,
          );
        }
        return sendError(res, "Refresh token không hợp lệ", 401);
      }

      // Bước 2: Kiểm tra token có trong DB và chưa bị thu hồi
      try {
        const dbToken = await validateRefreshTokenInDB(refresh_token);
        if (!dbToken) {
          logger.warn(
            `Refresh token not found or revoked for user ID: ${decoded.id}`,
          );
          return sendError(
            res,
            "Refresh token đã bị thu hồi hoặc không hợp lệ. Vui lòng đăng nhập lại",
            401,
          );
        }
      } catch (dbErr) {
        // Nếu bảng chưa tạo (migration chưa chạy), vẫn cho phép refresh
        logger.warn("Could not validate refresh token in DB:", dbErr.message);
      }

      // Bước 3: Lấy user và cấp access token mới
      const user = await User.getById(decoded.id);

      if (!user) {
        return sendError(res, "User not found", 401);
      }

      // Generate new access token
      const accessToken = generateToken(user);

      sendSuccess(
        res,
        {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 7 * 24 * 60 * 60,
        },
        "Token refreshed successfully",
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   GET /api/auth/me
 * @desc    Lấy thông tin user hiện tại
 * @access  Private
 */
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await User.getById(req.user.id);

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Get warehouse permissions
    const wh_permissions = await User.getWarehousePermissions(user.id);

    // Bổ sung: Nếu là ADMIN và permissions bị null, trả về full quyền để FE hiển thị đủ nút
    if (user.vai_tro === ROLES.ADMIN && (!user.permissions || Object.keys(user.permissions).length === 0)) {
      const { FULL_ADMIN_PERMISSIONS } = require("../config/constants");
      user.permissions = FULL_ADMIN_PERMISSIONS;
    }

    sendSuccess(
      res,
      {
        ...user,
        warehouse_permissions: wh_permissions,
      },
      "Lấy thông tin người dùng thành công",
    );
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/auth/me
 * @desc    Cập nhật thông tin cá nhân
 * @access  Private
 */
router.put(
  "/me",
  authenticate,
  validate(
    Joi.object({
      ho_ten: Joi.string().max(200),
      email: Joi.string().email().allow("", null),
      dien_thoai: Joi.string().max(50).allow("", null),
    }),
  ),
  async (req, res, next) => {
    try {
      const { ho_ten, email, dien_thoai } = req.body;

      // Chỉ cập nhật các trường thông tin cá nhân, không cho phép đổi vai_tro, role_id hay ma_kho qua đây
      const updatedUser = await User.update(req.user.id, {
        ho_ten,
        email,
        dien_thoai,
      });

      sendSuccess(res, updatedUser, "Cập nhật thông tin cá nhân thành công");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Đổi mật khẩu
 * @access  Private
 */
router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { old_password, new_password } = req.body;

      await User.changePassword(req.user.id, old_password, new_password);

      // Thu hồi tất cả refresh token cũ khi đổi mật khẩu (force logout thiết bị khác)
      try {
        await revokeAllUserTokens(req.user.id);
      } catch (dbErr) {
        logger.warn(
          "Could not revoke tokens after password change:",
          dbErr.message,
        );
      }

      logger.info(`Password changed: ${req.user.username}`);

      sendSuccess(
        res,
        null,
        "Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên các thiết bị khác.",
      );
    } catch (error) {
      if (error.message === "Mật khẩu cũ không đúng") {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Đăng xuất (client-side chỉ cần xóa token)
 * @access  Private
 */
router.post("/logout", authenticate, async (req, res, next) => {
  try {
    // Thu hồi refresh token khỏi DB nếu client gửi kèm hoặc có trong cookie
    const refresh_token = req.cookies?.refresh_token || req.body.refresh_token;
    if (refresh_token) {
      try {
        await revokeRefreshToken(refresh_token);
        logger.info(`Refresh token revoked for user: ${req.user.username}`);
      } catch (dbErr) {
        logger.warn("Could not revoke refresh token:", dbErr.message);
      }
    }

    // Clear the cookie
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    logger.info(`User logged out: ${req.user.username}`);
    sendSuccess(res, null, "Đăng xuất thành công");
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/auth/users
 * @desc    Lấy danh sách users (Admin only)
 * @access  Private (Admin)
 */
router.get(
  "/users",
  authenticate,
  checkPermission("users.view"),
  async (req, res, next) => {
    try {
      const filters = {
        vai_tro: req.query.vai_tro,
        ma_kho: req.query.ma_kho,
        trang_thai:
          req.query.trang_thai === "true"
            ? true
            : req.query.trang_thai === "false"
              ? false
              : undefined,
      };

      const users = await User.getAll(filters);

      sendSuccess(res, users, "Lấy danh sách users thành công");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   PUT /api/v1/auth/users/:id
 * @desc    Cập nhật user (Admin only)
 * @access  Private (Admin)
 */
router.put(
  "/users/:id",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.update(id, req.body);

      if (!user) {
        return sendError(res, "User không tồn tại", 404);
      }

      logger.info(`User updated by ${req.user.username}: User ID ${id}`);

      sendSuccess(res, user, "Cập nhật user thành công");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/users/:id/deactivate
 * @desc    Vô hiệu hóa user (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/users/:id/deactivate",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (id == req.user.id) {
        return sendError(res, "Không thể vô hiệu hóa chính mình", 400);
      }

      const user = await User.deactivate(id);

      if (!user) {
        return sendError(res, "User không tồn tại", 404);
      }

      logger.info(`User deactivated by ${req.user.username}: User ID ${id}`);

      sendSuccess(res, user, "Vô hiệu hóa user thành công");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/users/:id/activate
 * @desc    Kích hoạt user (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/users/:id/activate",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.activate(id);

      if (!user) {
        return sendError(res, "User không tồn tại", 404);
      }

      logger.info(`User activated by ${req.user.username}: User ID ${id}`);

      sendSuccess(res, user, "Kích hoạt user thành công");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   POST /api/v1/auth/users/:id/warehouses
 * @desc    Gán quyền kho cho user (Admin only)
 * @access  Private (Admin)
 */
router.post(
  "/users/:id/warehouses",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(assignWarehouseSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { ma_kho, ...permissions } = req.body;

      const result = await User.assignWarehouse(id, ma_kho, permissions);

      logger.info(
        `Warehouse permission assigned by ${req.user.username}: User ID ${id}, Warehouse ${ma_kho}`,
      );

      sendSuccess(res, result, "Gán quyền kho thành công");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   DELETE /api/v1/auth/users/:id/warehouses/:ma_kho
 * @desc    Xóa quyền kho của user (Admin only)
 * @access  Private (Admin)
 */
router.delete(
  "/users/:id/warehouses/:ma_kho",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { id, ma_kho } = req.params;

      await User.removeWarehouse(id, ma_kho);

      logger.info(
        `Warehouse permission removed by ${req.user.username}: User ID ${id}, Warehouse ${ma_kho}`,
      );

      sendSuccess(res, null, "Xóa quyền kho thành công");
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
