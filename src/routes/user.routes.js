const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { sendSuccess } = require("../ultils/respone");

const { ROLES } = require("../config/constants");
const userService = require("../services/user.service");

const Joi = require("joi");

/* ======================
 * VALIDATION
 * ====================== */

const createUserSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().min(6).required(),
  ho_ten: Joi.string().required(),
  email: Joi.string().email().allow(null, ""),
  dien_thoai: Joi.string().allow(null, ""),
  vai_tro: Joi.string().required(),
  ma_kho: Joi.string().allow(null),
});

const updateUserSchema = Joi.object({
  ho_ten: Joi.string(),
  email: Joi.string().email().allow(null, ""),
  dien_thoai: Joi.string().allow(null, ""),
  vai_tro: Joi.string(),
  ma_kho: Joi.string().allow(null),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

/* ======================
 * ROUTES
 * ====================== */

/**
 * GET /users
 * Query: vai_tro, ma_kho, trang_thai
 */
router.get(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const users = await userService.getAll(req.query);
      sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /users/:id
 */
router.get(
  "/:id",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      const user = await userService.getById(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /users
 */
router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(createUserSchema),
  async (req, res, next) => {
    try {
      const user = await userService.create(req.body);
      sendSuccess(res, user, "Tạo user thành công");
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /users/:id
 */
router.put(
  "/:id",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(updateUserSchema),
  async (req, res, next) => {
    try {
      const user = await userService.update(req.params.id, req.body);
      sendSuccess(res, user, "Cập nhật user thành công");
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /users/:id/deactivate
 */
router.patch(
  "/:id/deactivate",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      await userService.deactivate(req.params.id);
      sendSuccess(res, null, "Đã vô hiệu hóa user");
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /users/:id/activate
 */
router.patch(
  "/:id/activate",
  authenticate,
  checkRole(ROLES.ADMIN),
  async (req, res, next) => {
    try {
      await userService.activate(req.params.id);
      sendSuccess(res, null, "Đã kích hoạt user");
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /users/:id/change-password
 */
router.patch(
  "/:id/change-password",
  authenticate,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      await userService.changePassword(
        req.params.id,
        req.body.oldPassword,
        req.body.newPassword
      );
      sendSuccess(res, null, "Đổi mật khẩu thành công");
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
