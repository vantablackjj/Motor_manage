const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middleware/auth");
const { checkRole, checkPermission } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
} = require("../validations/user.validation");

/**
 * @route   GET /api/users
 * @desc    Lấy danh sách người dùng
 * @access  Private (users.view)
 */
router.get(
  "/",
  authenticate,
  checkPermission("users", "view"),
  userController.getAll,
);

/**
 * @route   GET /api/users/roles/all
 * @desc    Lấy tất cả các vai trò
 * @access  Private (users.view)
 */
router.get(
  "/roles/all",
  authenticate,
  checkPermission("users", "view"),
  userController.getRoles,
);

/**
 * @route   GET /api/users/:id/permissions
 * @desc    Lấy danh sách quyền cụ thể của người dùng
 * @access  Private
 */
router.get("/:id/permissions", authenticate, userController.getPermissions);

/**
 * @route   GET /api/users/:id
 * @desc    Lấy chi tiết người dùng
 * @access  Private (users.view)
 */
router.get(
  "/:id",
  authenticate,
  checkPermission("users", "view"),
  userController.getById,
);

/**
 * @route   GET /api/users/:id/warehouses
 * @desc    Lấy danh sách quyền kho của người dùng
 * @access  Private (ADMIN only)
 */
router.get(
  "/:id/warehouses",
  authenticate,
  checkPermission("users", "view"),
  userController.getWarehousePermissions,
);

/**
 * @route   POST /api/users
 * @desc    Tạo người dùng mới
 * @access  Private (users.create)
 */
router.post(
  "/",
  authenticate,
  checkPermission("users", "create"),
  validate(createUserSchema),
  userController.create,
);

/**
 * @route   PUT /api/users/:id
 * @desc    Cập nhật thông tin người dùng
 * @access  Private (users.edit)
 */
router.put(
  "/:id",
  authenticate,
  checkPermission("users", "edit"),
  validate(updateUserSchema),
  userController.update,
);

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Vô hiệu hóa người dùng
 * @access  Private (users.delete/ADMIN)
 */
router.patch(
  "/:id/deactivate",
  authenticate,
  checkPermission("users", "delete"),
  userController.deactivate,
);

/**
 * @route   PATCH /api/users/:id/activate
 * @desc    Kích hoạt người dùng
 * @access  Private (users.delete/ADMIN)
 */
router.patch(
  "/:id/activate",
  authenticate,
  checkPermission("users", "delete"),
  userController.activate,
);

/**
 * @route   PATCH /api/users/:id/change-password
 * @desc    Đổi mật khẩu cá nhân
 * @access  Private
 */
router.patch(
  "/:id/change-password",
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword,
);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Đặt lại mật khẩu cho người dùng khác
 * @access  Private (users.edit)
 */
router.post(
  "/:id/reset-password",
  authenticate,
  checkPermission("users", "edit"),
  validate(resetPasswordSchema),
  userController.resetPassword,
);

module.exports = router;
