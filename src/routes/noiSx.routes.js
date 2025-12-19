// validators/color.schema.js (hoặc để trong route cũng được)
const Joi = require('joi');
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validation');
const { ROLES } = require('../config/constants');


const noiSx = Joi.object({
  ma: Joi.string().required().max(50),  
  ten_noi_sx: Joi.string().required().max(100),
  
  status: Joi.boolean().default(true),
});  




const controller = require('../controllers/noiSx.controller');


router.get('/', authenticate, controller.getAll);
router.get('/:ma', authenticate, controller.getOne);

router.post(
  '/',
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(noiSx),
  controller.create
);

router.put(
  '/:ma',
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(noiSx),
  controller.update
);

router.delete(
  '/:ma',
  authenticate,
  checkRole(ROLES.ADMIN),
  controller.remove
);

module.exports = router;
