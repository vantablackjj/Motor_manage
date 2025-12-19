const express = require('express');
const router = express.Router();
const InventoryService = require('../services/tonKho.service');
const { sendSuccess, sendError } = require('../ultils/respone');

// Lấy tất cả tồn kho
router.get('/', async (req, res) => {
  try {
    const data = await InventoryService.getAll(req.query);
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
