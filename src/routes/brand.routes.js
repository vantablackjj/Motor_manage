// validators/brand.schema.js
const Joi = require("joi");

const express = require("express");
const router = express.Router();

const brandSchema = Joi.object({
  ma_nh: Joi.string().max(50),
  ten_nh: Joi.string().required().max(200),
  ma_nhom_cha: Joi.string().max(50),
  status: Joi.boolean(),
});

const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");

const controller = require("../controllers/brand.controller");

router.get("/", authenticate, controller.getAll);
router.get("/:id", authenticate, controller.getOne);

router.post(
  "/",
  authenticate,
  checkPermission("products", "create"),
  validate(brandSchema),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("products", "edit"),
  validate(brandSchema),
  controller.update,
);

router.delete("/:id", authenticate, checkPermission("products", "delete"), controller.delete);

module.exports = router;
