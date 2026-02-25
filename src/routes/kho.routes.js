const express = require("express");
const router = express.Router();
const khoController = require("../controllers/kho.controller");
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");
const { validate } = require("../middleware/validation");
const {
  createKhoSchema,
  updateKhoSchema,
} = require("../validations/kho.validation");

/**
 * @route   GET /api/kho
 * @desc    Lấy danh sách các kho trong hệ thống
 * @access  Private
 */
router.get("/", authenticate, khoController.getAll);

/**
 * @route   GET /api/kho/:ma_kho
 * @desc    Lấy chi tiết thông tin kho
 * @access  Private
 */
router.get("/:ma_kho", authenticate, khoController.getByMa);

/**
 * @route   POST /api/kho
 * @desc    Tạo kho mới
 * @access  Private (warehouses.create)
 */
router.post(
  "/",
  authenticate,
  checkPermission("warehouses", "create"),
  validate(createKhoSchema),
  khoController.create,
);

/**
 * @route   PUT /api/kho/:ma_kho
 * @desc    Cập nhật thông tin kho
 * @access  Private (warehouses.edit)
 */
router.put(
  "/:ma_kho",
  authenticate,
  checkPermission("warehouses", "edit"),
  validate(updateKhoSchema),
  khoController.update,
);

/**
 * @route   DELETE /api/kho/:id
 * @desc    Xóa kho (soft delete)
 * @access  Private (warehouses.delete)
 */
router.delete(
  "/:id",
  authenticate,
  checkPermission("warehouses", "delete"),
  khoController.delete,
);

module.exports = router;
