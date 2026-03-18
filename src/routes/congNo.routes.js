const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { sendSuccess } = require("../utils/response");
const congNoService = require("../services/congNo.service");

// GET /api/cong-no - Tổng hợp công nợ
// KE_TOAN, QUAN_LY, ADMIN được xem
router.get(
  "/",
  authenticate,
  checkPermission("debt", "view"),
  async (req, res, next) => {
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
  },
);

// GET /api/cong-no/chi-tiet - Chi tiết khoản nợ của cặp kho
router.get(
  "/chi-tiet",
  authenticate,
  checkPermission("debt", "view"),
  async (req, res, next) => {
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
  },
);

// POST /api/cong-no/thanh-toan - Thanh toán
// KE_TOAN, QUAN_LY, ADMIN được thanh toán
router.post(
  "/thanh-toan",
  authenticate,
  checkPermission("payments", "create"),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        ma_kho_tra: req.body.ma_kho_tra || req.body.ma_kho_no,
        ma_kho_nhan: req.body.ma_kho_nhan || req.body.ma_kho_co,
      };

      const result = await congNoService.thanhToan(data, req.user.id);
      sendSuccess(res, result, "Thanh toán thành công");
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/cong-no/doi-tac - Tổng hợp công nợ đối tác
router.get(
  "/doi-tac",
  authenticate,
  checkPermission("debt", "view"),
  async (req, res, next) => {
    try {
      const filters = {
        ma_doi_tac: req.query.ma_doi_tac,
        loai_cong_no: req.query.loai_cong_no,
      };
      const data = await congNoService.getTongHopDoiTac(filters);
      sendSuccess(res, data, "Lấy danh sách công nợ đối tác thành công");
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/cong-no/doi-tac/chi-tiet - Chi tiết công nợ đối tác
router.get(
  "/doi-tac/chi-tiet",
  authenticate,
  checkPermission("debt", "view"),
  async (req, res, next) => {
    try {
      const { ma_doi_tac, loai_cong_no } = req.query;
      if (!ma_doi_tac || !loai_cong_no) {
        throw new Error("Phải cung cấp mã đối tác và loại công nợ");
      }
      const data = await congNoService.getChiTietDoiTac(
        ma_doi_tac,
        loai_cong_no,
      );
      sendSuccess(res, data, "Lấy chi tiết công nợ đối tác thành công");
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/cong-no/doi-tac/thanh-toan - Thanh toán cho đối tác
router.post(
  "/doi-tac/thanh-toan",
  authenticate,
  checkPermission("payments", "create"),
  async (req, res, next) => {
    try {
      const result = await congNoService.thanhToanDoiTac(req.body, req.user.id);
      sendSuccess(res, result, "Tạo lệnh thanh toán đối tác thành công");
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
