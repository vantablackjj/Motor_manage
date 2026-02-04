// validators/brand.schema.js
const Joi = require("joi");

const express = require("express");
const router = express.Router();

const brandSchema = Joi.object({
  ma_nh: Joi.string().max(50),
  ten_nh: Joi.string().required().max(200),
  status: Joi.boolean().default(true),
  type: Joi.string().valid("XE", "PT").default("XE"),
});

const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { ROLES } = require("../config/constants");

const controller = require("../controllers/brand.controller");

router.get("/", authenticate, controller.getAll);
router.get("/:id", authenticate, controller.getOne);

router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(brandSchema),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(brandSchema),
  controller.update,
);

router.delete("/:id", authenticate, checkRole(ROLES.ADMIN), controller.delete);

module.exports = router;
