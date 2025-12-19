// validators/model.schema.js
const Joi = require('joi');
// routes/model.routes.js
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validation');
const { ROLES } = require('../config/constants');

const controller = require('../controllers/modelCar.controller');

const modelSchema = Joi.object({
  ma_loai: Joi.string().required().max(50),
  ten_loai: Joi.string().required().max(200),
  ma_nh: Joi.string().required().max(50),
  noi_sx: Joi.string().required().max(50),
  loai_hinh: Joi.string().required().max(50),

  gia_nhap: Joi.number().min(0).required(),
  gia_ban: Joi.number().min(0).required(),
  gia_thue: Joi.number().min(0).allow(null),
  vat: Joi.number().min(0).allow(null),

  status: Joi.boolean().default(true),
});

router.get('/', authenticate, controller.getAll);
router.get('/:ma_loai', authenticate, controller.getOne);

router.post(
  '/',
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(modelSchema),
  controller.create
);

router.put(
  '/:ma_loai',
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(modelSchema),
  controller.update
);

router.delete(
  '/:ma_loai',
  authenticate,
  checkRole(ROLES.ADMIN),
  controller.remove
);

module.exports = router;
