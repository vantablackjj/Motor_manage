const express = require('express');
const router = express.Router();
const InventoryService = require('../services/tonKho.service');
const { sendSuccess, sendError } = require('../utils/response');

// Lấy tất cả tồn kho
router.get('/', async (req, res) => {
  try {
    const data = await InventoryService.getAll(req.query);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message);
  }
});
// Lấy tồn kho theo kho
router.get("/kho/:ma_kho", async (req, res) => {
  try {
    const { ma_kho } = req.params;
    const data = await InventoryService.getByID(ma_kho);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message);
  }
});

// Lấy tồn kho của 1 mã phụ tùng trên toàn hệ thống (hoặc theo kho bị giới hạn)
router.get("/phu-tung/:ma_pt", async (req, res) => {
  try {
    const { ma_pt } = req.params;
    let data = await InventoryService.getByPT(ma_pt);

    // Isolation check
    const { ROLES } = require("../config/constants");
    if (
      req.user &&
      [ROLES.BAN_HANG, ROLES.KHO, ROLES.KY_THUAT, ROLES.NHAN_VIEN].includes(
        req.user.vai_tro,
      )
    ) {
      data = data.filter((item) => item.ma_kho === req.user.ma_kho);
    }

    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message);
  }
});
// Tạo tồn kho ban đầu
router.post('/init', async (req, res) => {
  try {
    const data = await InventoryService.createInitial(req.body);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message);
  }
});

// Nhập kho (+ qty)
router.post('/increase', async (req, res) => {
  try {
    const { ma_kho, ma_sp, qty } = req.body;
    const data = await InventoryService.increaseStock(ma_kho, ma_sp, qty);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message);
  }
});

// Xuất kho (- qty)
router.post('/decrease', async (req, res) => {
  try {
    const { ma_kho, ma_sp, qty } = req.body;
    const data = await InventoryService.decreaseStock(ma_kho, ma_sp, qty);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message);
  }
});

// Chuyển kho
router.post('/transfer', async (req, res) => {
  try {
    const { fromKho, toKho, ma_sp, qty } = req.body;
    const data = await InventoryService.transfer(fromKho, toKho, ma_sp, qty);
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, err.message);
  }
});

module.exports = router;
