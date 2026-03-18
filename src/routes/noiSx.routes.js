// validators/color.schema.js (hoặc để trong route cũng được)
const Joi = require("joi");
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");

const noiSxSchema = Joi.object({
  ma: Joi.string().required().max(50),
  ten_noi_sx: Joi.string().required().max(100),
  status: Joi.boolean().default(true),
});

const updateNoiSxSchema = Joi.object({
  ma: Joi.string().max(50),
  ten_noi_sx: Joi.string().max(100),
  status: Joi.boolean(),
});

const controller = require("../controllers/noiSx.controller");

router.get("/", authenticate, controller.getAll);
router.get("/:id", authenticate, controller.getOne);

router.post(
  "/",
  authenticate,
  checkPermission("products", "create"),
  validate(noiSxSchema),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("products", "edit"),
  validate(updateNoiSxSchema),
  controller.update,
);

router.delete("/:id", authenticate, checkPermission("products", "delete"), controller.remove);

module.exports = router;
