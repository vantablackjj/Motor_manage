const Joi = require("joi")

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validation');
const { sendSuccess, sendError } = require('../utils/response');

const CarColorService = require('../services/carColor.service');

const carColor = Joi.object({
    ma_loai_xe : Joi.string().required().max(50),
    ma_mau: Joi.string().required().max(50),
    status : Joi.boolean().default(true)
})

router.get('/', authenticate, checkPermission('products', 'view'), async (req, res, next) => {
    try {
        const data = await CarColorService.getAll();
        sendSuccess(res, data);
    } catch (e) {
        next(e);
    }
});

// ======================
// GET COLORS OF MODEL
// ======================
router.get(
  '/:ma_loai_xe/colors',
  authenticate,
  async (req, res, next) => {
    try {
      const data = await CarColorService.getColorsByModel(req.params.ma_loai_xe);
      sendSuccess(res, data);
    } catch (e) {
      next(e);
    }
  }
);

// ======================
// ASSIGN COLOR
// ======================
router.post(
  '/models/colors',
  authenticate,
  checkPermission('products', 'create'),
  validate(carColor),
  async (req, res, next) => {
    try {
      const data = await CarColorService.assignColor(req.body);
      sendSuccess(res, data, 201);
    } catch (e) {
      next(e);
    }
  }
);

// ======================
// REMOVE COLOR
// ======================
router.delete(
  '/models/:ma_loai_xe/colors/:ma_mau',
  authenticate,
  checkPermission('products', 'delete'),
  async (req, res, next) => {
    try {
      const data = await CarColorService.removeColor(
        req.params.ma_loai_xe,
        req.params.ma_mau
      );
      sendSuccess(res, data);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
