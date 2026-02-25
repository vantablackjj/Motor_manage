const express = require("express");
const router = express.Router();
const xeController = require("../controllers/xe.controller");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { checkPermission } = require("../middleware/permissions");
const {
  themXeSchema,
  capNhatXeSchema,
  checkDuplicateSchema,
} = require("../validations/xe.validation");

/**
 * @route   GET /api/xe/:xe_key
 * @desc    Lấy chi tiết xe theo xe_key
 * @access  Private (products.view)
 */
router.get(
  "/:xe_key",
  authenticate,
  checkPermission("products", "view"),
  xeController.getByXeKey,
);

/**
 * @route   GET /api/xe/kho/:ma_kho
 * @desc    Lấy tồn kho theo mã kho
 * @access  Private (inventory.view)
 */
router.get(
  "/kho/:ma_kho",
  authenticate,
  checkPermission("inventory", "view"),
  xeController.getTonKho,
);

// Alias cho tồn kho
router.get(
  "/ton-kho/:ma_kho",
  authenticate,
  checkPermission("inventory", "view"),
  xeController.getTonKho,
);

/**
 * @route   GET /api/xe/:xe_key/lich-su
 * @desc    Lấy lịch sử giao dịch xe
 */
router.get(
  "/:xe_key/lich-su",
  authenticate,
  checkPermission("products", "view"),
  xeController.getHistory,
);

/**
 * @route   GET /api/xe/approval/list
 * @desc    Danh sách xe đang chờ phê duyệt nhập
 */
router.get(
  "/approval/list",
  authenticate,
  checkPermission("products", "view"),
  xeController.getApprovalList,
);

/**
 * @route   POST /api/xe
 * @desc    Nhập xe mới (trạng thái chờ duyệt)
 */
router.post(
  "/",
  authenticate,
  checkPermission("inventory", "import"),
  validate(themXeSchema),
  xeController.createVehicle,
);

/**
 * @route   POST /api/xe/:xe_key/submit
 * @desc    Gửi yêu cầu duyệt xe
 */
router.post(
  "/:xe_key/submit",
  authenticate,
  checkPermission("inventory", "import"),
  xeController.submitForApproval,
);

/**
 * @route   POST /api/xe/:xe_key/approve
 * @desc    Phê duyệt nhập xe
 */
router.post(
  "/:xe_key/approve",
  authenticate,
  checkPermission("products", "approve"),
  xeController.approveVehicle,
);

/**
 * @route   POST /api/xe/:xe_key/reject
 * @desc    Từ chối nhập xe
 */
router.post(
  "/:xe_key/reject",
  authenticate,
  checkPermission("products", "approve"),
  xeController.rejectVehicle,
);

/**
 * @route   PUT /api/xe/:xe_key
 * @desc    Cập nhật thông tin xe
 */
router.put(
  "/:xe_key",
  authenticate,
  checkPermission("products", "edit"),
  validate(capNhatXeSchema),
  xeController.updateVehicle,
);

/**
 * @route   PUT /api/xe/:xe_key/lock
 * @desc    Khóa xe để dành cho giao dịch
 */
router.put(
  "/:xe_key/lock",
  authenticate,
  checkPermission("inventory", "import"),
  xeController.lockVehicle,
);

/**
 * @route   PUT /api/xe/:xe_key/unlock
 * @desc    Mở khóa xe
 */
router.put(
  "/:xe_key/unlock",
  authenticate,
  checkPermission("inventory", "import"),
  xeController.unlockVehicle,
);

/**
 * @route   POST /api/xe/check-duplicate
 * @desc    Kiểm tra trùng số khung, số máy
 */
router.post(
  "/check-duplicate",
  authenticate,
  validate(checkDuplicateSchema),
  xeController.checkDuplicate,
);

module.exports = router;
