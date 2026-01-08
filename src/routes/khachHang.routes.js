// validators/brand.schema.js
const Joi = require("joi");

const express = require("express");
const router = express.Router();

const brandSchema = Joi.object({
  ma_kh: Joi.string().required().max(50),
  ho_ten: Joi.string().required().max(200),
  dia_chi: Joi.string().max(300).allow(null, ""),
  dien_thoai: Joi.string().max(15).allow(null, ""),
  email: Joi.string().email().max(100).allow(null, ""),
  ho_khau: Joi.string().max(300).allow(null, ""),
  la_ncc: Joi.boolean().default(false),
  ngay_sinh: Joi.date().allow(null, ""),
  ma_so_thue: Joi.string().max(50).allow(null, ""),
  so_cmnd: Joi.string().max(20).allow(null, ""),
  dai_dien: Joi.string().max(100).allow(null, ""),

  status: Joi.boolean().default(true),
});

const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");
const { ROLES } = require("../config/constants");

const controller = require("../controllers/khachHang.controller");

router.get("/", authenticate, controller.getAll);
router.get("/:ma_kh", authenticate, controller.getOne);

router.post(
  "/",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.NHAN_VIEN_BAN_HANG),
  validate(brandSchema),
  controller.create
);

router.put(
  "/:ma_kh",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY_CTY, ROLES.NHAN_VIEN_BAN_HANG),
  validate(brandSchema),
  controller.update
);

router.delete(
  "/:ma_kh",
  authenticate,
  checkRole(ROLES.ADMIN),
  controller.remove
);

module.exports = router;
