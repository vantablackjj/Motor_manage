
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { sendSuccess, sendError } = require('../ultils/respone');
const User = require('../services/user.service');
const { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} = require('../middleware/auth');
const Joi = require('joi');
const { ROLES } = require('../config/constants');
const logger = require('../ultils/logger');

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const loginSchema = Joi.object({
  username: Joi.string().required().min(3).max(100),
  password: Joi.string().required().min(6)
});

const registerSchema = Joi.object({
  username: Joi.string().required().min(3).max(100),
  password: Joi.string().required().min(6).max(50),
  ho_ten: Joi.string().required().max(200),
  email: Joi.string().email().allow('', null),
  dien_thoai: Joi.string().max(50).allow('', null),
  vai_tro: Joi.string().valid(...Object.values(ROLES)).required(),
  ma_kho: Joi.string().max(50).allow(null)
});

const changePasswordSchema = Joi.object({
  old_password: Joi.string().required().min(6),
  new_password: Joi.string().required().min(6).max(50)
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required()
});

const assignWarehouseSchema = Joi.object({
  ma_kho: Joi.string().required().max(50),
  quyen_xem: Joi.boolean().default(true),
  quyen_them: Joi.boolean().default(false),
  quyen_sua: Joi.boolean().default(false),
  quyen_xoa: Joi.boolean().default(false),
  quyen_chuyen_kho: Joi.boolean().default(false)
});

// ============================================================
// ROUTES
// ============================================================

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Tìm user
    const user = await User.getByUsername(username);
    console.log(user);
    if (!user) {
      logger.warn(`Login failed: User not found - ${username}`);
      return sendError(res, 'Tên đăng nhập hoặc mật khẩu không đúng', 401);
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      logger.warn(`Login failed: Wrong password - ${username}`);
      return sendError(res, 'Tên đăng nhập hoặc mật khẩu không đúng', 401);
    }
    
    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Update last login
    await User.updateLastLogin(user.id);
    
    // Remove sensitive data
    delete user.password;
    
    logger.info(`User logged in successfully: ${username}`);
    
    sendSuccess(res, {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
      user
    }, 'Đăng nhập thành công');
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Đăng ký tài khoản mới (Admin only)
 * @access  Private (Admin)
 */
router.post('/register',
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { username } = req.body;
      
      // Check username exists
      const existing = await User.getByUsername(username);
      
      if (existing) {
        return sendError(res, 'Tên đăng nhập đã tồn tại', 409);
      }
      
      // Create user
      const user = await User.create(req.body);
      
      logger.info(`New user created by ${req.user.username}: ${username}`);
      
      sendSuccess(res, user, 'Đăng ký tài khoản thành công', 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refresh_token);
    
    // Get user
    const user = await User.getById(decoded.id);
    
    if (!user) {
      return sendError(res, 'User not found', 401);
    }
    
    // Generate new access token
    const accessToken = generateToken(user);
    
    sendSuccess(res, {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 7 * 24 * 60 * 60
    }, 'Token refreshed successfully');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Refresh token expired. Please login again', 401);
    }
    next(error);
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Lấy thông tin user hiện tại
 * @access  Private
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.getById(req.user.id);
    
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    
    // Get warehouse permissions
    const permissions = await User.getWarehousePermissions(user.id);
    
    sendSuccess(res, {
      ...user,
      warehouse_permissions: permissions
    }, 'Lấy thông tin người dùng thành công');
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Đổi mật khẩu
 * @access  Private
 */
router.put('/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { old_password, new_password } = req.body;
      
      await User.changePassword(req.user.id, old_password, new_password);
      
      logger.info(`Password changed: ${req.user.username}`);
      
      sendSuccess(res, null, 'Đổi mật khẩu thành công');
    } catch (error) {
      if (error.message === 'Mật khẩu cũ không đúng') {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Đăng xuất (client-side chỉ cần xóa token)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    logger.info(`User logged out: ${req.user.username}`);
    
    sendSuccess(res, null, 'Đăng xuất thành công');
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/auth/users
 * @desc    Lấy danh sách users (Admin only)
 * @access  Private (Admin)
 */
router.get('/users',
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const filters = {
        vai_tro: req.query.vai_tro,
        ma_kho: req.query.ma_kho,
        trang_thai: req.query.trang_thai === 'true' ? true : req.query.trang_thai === 'false' ? false : undefined
      };
      
      const users = await User.getAll(filters);
      
      sendSuccess(res, users, 'Lấy danh sách users thành công');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/auth/users/:id
 * @desc    Cập nhật user (Admin only)
 * @access  Private (Admin)
 */
router.put('/users/:id',
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.update(id, req.body);
      
      if (!user) {
        return sendError(res, 'User không tồn tại', 404);
      }
      
      logger.info(`User updated by ${req.user.username}: User ID ${id}`);
      
      sendSuccess(res, user, 'Cập nhật user thành công');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/users/:id/deactivate
 * @desc    Vô hiệu hóa user (Admin only)
 * @access  Private (Admin)
 */
router.post('/users/:id/deactivate',
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      if (id == req.user.id) {
        return sendError(res, 'Không thể vô hiệu hóa chính mình', 400);
      }
      
      const user = await User.deactivate(id);
      
      if (!user) {
        return sendError(res, 'User không tồn tại', 404);
      }
      
      logger.info(`User deactivated by ${req.user.username}: User ID ${id}`);
      
      sendSuccess(res, user, 'Vô hiệu hóa user thành công');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/users/:id/activate
 * @desc    Kích hoạt user (Admin only)
 * @access  Private (Admin)
 */
router.post('/users/:id/activate',
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.activate(id);
      
      if (!user) {
        return sendError(res, 'User không tồn tại', 404);
      }
      
      logger.info(`User activated by ${req.user.username}: User ID ${id}`);
      
      sendSuccess(res, user, 'Kích hoạt user thành công');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/auth/users/:id/warehouses
 * @desc    Gán quyền kho cho user (Admin only)
 * @access  Private (Admin)
 */
router.post('/users/:id/warehouses',
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(assignWarehouseSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { ma_kho, ...permissions } = req.body;
      
      const result = await User.assignWarehouse(id, ma_kho, permissions);
      
      logger.info(`Warehouse permission assigned by ${req.user.username}: User ID ${id}, Warehouse ${ma_kho}`);
      
      sendSuccess(res, result, 'Gán quyền kho thành công');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/auth/users/:id/warehouses/:ma_kho
 * @desc    Xóa quyền kho của user (Admin only)
 * @access  Private (Admin)
 */
router.delete('/users/:id/warehouses/:ma_kho',
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const { id, ma_kho } = req.params;
      
      await User.removeWarehouse(id, ma_kho);
      
      logger.info(`Warehouse permission removed by ${req.user.username}: User ID ${id}, Warehouse ${ma_kho}`);
      
      sendSuccess(res, null, 'Xóa quyền kho thành công');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;