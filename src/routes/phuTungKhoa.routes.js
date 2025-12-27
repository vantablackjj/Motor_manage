const express = require('express');
const router = express.Router();
const controller = require('../controllers/phuTungKhoa.controller');

router.get('/kho/:ma_kho', controller.getByKho);
router.post('/lock', controller.lock);
router.delete('/unlock/:so_phieu', controller.unlock);

module.exports = router;
