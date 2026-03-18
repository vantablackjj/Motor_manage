// validators/model.schema.js
const Joi = require("joi");
// routes/model.routes.js
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");

const controller = require("../controllers/modelCar.controller");

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

const updateModelSchema = Joi.object({
  ma_loai: Joi.string().max(50),
  ten_loai: Joi.string().max(200),
  ma_nh: Joi.string().max(50),
  noi_sx: Joi.string().max(50),
  loai_hinh: Joi.string().max(50),

  gia_nhap: Joi.number().min(0),
  gia_ban: Joi.number().min(0),
  gia_thue: Joi.number().min(0).allow(null),
  vat: Joi.number().min(0).allow(null),

  status: Joi.boolean(),
});

router.get("/", authenticate, controller.getAll);
router.get("/:ma_loai", authenticate, controller.getOne);

router.post(
  "/",
  authenticate,
  checkPermission("products", "create"),
  validate(modelSchema),
  controller.create,
);

router.put(
  "/:ma_loai",
  authenticate,
  checkPermission("products", "edit"),
  validate(updateModelSchema),
  controller.update,
);

router.delete(
  "/:ma_loai",
  authenticate,
  checkPermission("products", "delete"),
  controller.remove,
);

module.exports = router;
