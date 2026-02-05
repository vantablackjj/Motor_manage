const Joi = require("joi");
// routes/color.routes.js
const express = require("express");
const router = express.Router();

const colorSchema = Joi.object({
  ma_mau: Joi.string().required().max(50),
  ten_mau: Joi.string().required().max(100),
  gia_tri: Joi.string().required().max(50),
  mac_dinh: Joi.boolean().default(false),
  status: Joi.boolean().default(true),
});

const updateColorSchema = Joi.object({
  ma_mau: Joi.string().max(50),
  ten_mau: Joi.string().max(100),
  gia_tri: Joi.string().max(50),
  mac_dinh: Joi.boolean(),
  status: Joi.boolean(),
});

const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { ROLES } = require("../config/constants");

const colorController = require("../controllers/color.controller");

router.get("/", authenticate, colorController.getAll);
router.get("/:ma_mau", authenticate, colorController.getOne);

router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(colorSchema),
  colorController.create,
);

router.put(
  "/:ma_mau",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(updateColorSchema),
  colorController.update,
);

router.delete(
  "/:ma_mau",
  authenticate,
  checkRole(ROLES.ADMIN),
  colorController.remove,
);

module.exports = router;
