const Joi = require("joi");
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");

const loaiHinhShema = Joi.object({
  ma_lh: Joi.string().required().max(50),
  ten_lh: Joi.string().required().max(200),
  mac_dinh: Joi.boolean().default(false),
  status: Joi.boolean().default(true),
});

const updateLoaiHinhSchema = Joi.object({
  ma_lh: Joi.string().max(50),
  ten_lh: Joi.string().max(200),
  mac_dinh: Joi.boolean(),
  status: Joi.boolean(),
});

const controller = require("../controllers/loaiHinh.controller");

router.get("/", authenticate, controller.getAll);
router.get("/:id", authenticate, controller.getOne);

router.post(
  "/",
  authenticate,
  checkPermission("products", "create"),
  validate(loaiHinhShema),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("products", "edit"),
  validate(updateLoaiHinhSchema),
  controller.update,
);

router.delete("/:id", authenticate, checkPermission("products", "delete"), controller.remove);

module.exports = router;
