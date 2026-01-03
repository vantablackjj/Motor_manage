const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { sendSuccess } = require("../ultils/respone");
const congNoService = require("../services/congNo.service");
const { ROLES } = require("../config/constants");

// GET /api/cong-no - Tổng hợp công nợ
router.get("/", authenticate, async (req, res, next) => {
  try {
    const filters = {
      ma_kho_no: req.query.ma_kho_no,
      ma_kho_co: req.query.ma_kho_co,
    };
    const data = await congNoService.getTongHop(filters);
    sendSuccess(res, data, "Lấy danh sách công nợ thành công");
  } catch (error) {
    next(error);
  }
});

// GET /api/cong-no/chi-tiet - Chi tiết khoản nợ của cặp kho
router.get("/chi-tiet", authenticate, async (req, res, next) => {
  try {
    const { ma_kho_no, ma_kho_co } = req.query;
    if (!ma_kho_no || !ma_kho_co) {
      throw new Error("Phải cung cấp kho nợ và kho có");
    }
    const data = await congNoService.getChiTiet(ma_kho_no, ma_kho_co);
    sendSuccess(res, data, "Lấy chi tiết công nợ thành công");
  } catch (error) {
    next(error);
  }
});

// POST /api/cong-no/thanh-toan - Thanh toán
router.post(
  "/thanh-toan",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.QUAN_LY_CHI_NHANH),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        ma_kho_nhan: req.body.ma_kho_co, // Mapping frontend field name if needed
      };

      const result = await congNoService.thanhToan(data, req.user.username);
      sendSuccess(res, result, "Thanh toán thành công");
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
