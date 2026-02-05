// validators/color.schema.js (hoặc để trong route cũng được)
const Joi = require("joi");
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { ROLES } = require("../config/constants");

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
  checkRole(ROLES.ADMIN),
  validate(noiSxSchema),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkRole(ROLES.ADMIN),
  validate(updateNoiSxSchema),
  controller.update,
);

router.delete("/:id", authenticate, checkRole(ROLES.ADMIN), controller.remove);

module.exports = router;
