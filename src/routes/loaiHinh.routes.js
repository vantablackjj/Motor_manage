const Joi = require("joi")
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validation');
const { ROLES } = require('../config/constants');

const loaiHinhShema = Joi.object({
    ma_lh : Joi.string().required().max(50),
    ten_lh :Joi.string().required().max(200),
    mac_dinh:Joi.boolean().default(false),
        status:Joi.boolean().default(true)
    
})



const controller = require('../controllers/loaiHinh.controller');


router.get('/', authenticate, controller.getAll);
router.get('/:ma_lh', authenticate, controller.getOne);

router.post(
  '/',
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(loaiHinhShema),
  controller.create
);

router.put(
  '/:ma_lh',
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(loaiHinhShema),
  controller.update
);

router.delete(
  '/:ma_lh',
  authenticate,
  checkRole(ROLES.ADMIN),
  controller.remove
);

module.exports = router;
