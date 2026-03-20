const express = require("express");
const router = express.Router();
const logController = require("../controllers/log.controller");
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");

/**
 * @route   GET /api/logs
 * @desc    Lấy danh sách nhật ký hoạt động
 * @access  Private (Admin Only)
 */
router.get("/", authenticate, checkRole(["ADMIN"]), logController.getAll);

module.exports = router;
