const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const Joi = require("joi");
const DichVuSauBanController = require("../controllers/dichVuSauBan.controller");

/**
 * @swagger
 * tags:
 *   name: DichVuSauBan
 *   description: Quản lý dịch vụ sau bán xe (Đăng ký biển số, Đăng kiểm)
 */

router.use(authenticate);

/**
 * GET /api/dich-vu-sau-ban/stats
 * Thống kê nhanh: số xe chưa đăng ký, chưa đăng kiểm
 */
router.get(
  "/stats",
  checkPermission("sales_orders", "view"),
  DichVuSauBanController.getStats,
);

/**
 * GET /api/dich-vu-sau-ban
 * Danh sách xe đã bán với trạng thái dịch vụ
 * Query: trang_thai (chua_dang_ky|chua_dang_kiem|hoan_thanh|pending), so_hoa_don, search, page, limit
 */
router.get(
  "/",
  checkPermission("sales_orders", "view"),
  DichVuSauBanController.getList,
);

/**
 * GET /api/dich-vu-sau-ban/:xe_key
 * Chi tiết xe + trạng thái dịch vụ
 */
router.get(
  "/:xe_key",
  checkPermission("sales_orders", "view"),
  DichVuSauBanController.getByXeKey,
);

/**
 * PATCH /api/dich-vu-sau-ban/:xe_key/dang-ky
 * Đánh dấu đã trả đăng ký + nhập biển số
 * Body: { bien_so: string (required), ngay_tra_dang_ky?: date, ghi_chu?: string }
 */
router.patch(
  "/:xe_key/dang-ky",
  checkPermission("sales_orders", "edit"),
  validate(
    Joi.object({
      bien_so: Joi.string().trim().max(20).required().messages({
        "any.required": "Biển số là bắt buộc khi cập nhật đăng ký",
      }),
      ngay_tra_bien: Joi.date().iso().allow(null, ""),
      ghi_chu: Joi.string().allow(null, ""),
    }),
  ),
  DichVuSauBanController.capNhatDangKy,
);

/**
 * PATCH /api/dich-vu-sau-ban/:xe_key/dang-kiem
 * Đánh dấu đã trả đăng kiểm + nhập ngày trả
 * Body: { ngay_tra_dang_kiem?: date, ghi_chu?: string }
 */
router.patch(
  "/:xe_key/dang-kiem",
  checkPermission("sales_orders", "edit"),
  validate(
    Joi.object({
      ngay_tra_giay_dang_kiem: Joi.date().iso().allow(null, ""),
      han_dang_kiem: Joi.date().iso().allow(null, ""),
      ghi_chu: Joi.string().allow(null, ""),
    }).min(1),
  ),
  DichVuSauBanController.capNhatDangKiem,
);

/**
 * POST /api/dich-vu-sau-ban/xuat-bien-ban
 * Xuất biên bản bàn giao xe hoặc giấy tờ
 */
router.post(
  "/xuat-bien-ban",
  checkPermission("sales_orders", "view"), // Chỉ cần quyền xem để in
  DichVuSauBanController.xuatBienBan,
);

module.exports = router;
