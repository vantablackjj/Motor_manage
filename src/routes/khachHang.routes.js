// validators/brand.schema.js
const Joi = require("joi");

const express = require("express");
const router = express.Router();

const brandSchema = Joi.object({
  ma_kh: Joi.string().max(50),
  ho_ten: Joi.string().required().max(200),
  dia_chi: Joi.string().max(300).allow(null, ""),
  dien_thoai: Joi.string().max(15).allow(null, ""),
  email: Joi.string().email().max(100).allow(null, ""),
  ho_khau: Joi.string().max(300).allow(null, ""),
  // Không set default cho la_ncc để phân biệt được khi client không gửi lên
  la_ncc: Joi.boolean().optional(),
  loai_doi_tac: Joi.string()
    .valid("KHACH_HANG", "NHA_CUNG_CAP", "CA_HAI")
    .optional(),
  is_business: Joi.boolean().allow(null),
  ngay_sinh: Joi.date().allow(null, ""),
  ma_so_thue: Joi.string().max(50).allow(null, ""),
  so_cmnd: Joi.string().max(20).allow(null, ""),
  dai_dien: Joi.string().max(100).allow(null, ""),

  status: Joi.boolean().default(true),
});

const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");
const { validate } = require("../middleware/validation");

const controller = require("../controllers/khachHang.controller");

router.get("/", authenticate, controller.getAll);
router.get("/:ma_kh", authenticate, controller.getOne);

router.post(
  "/",
  authenticate,
  checkPermission("partners", "create"),
  validate(brandSchema),
  controller.create,
);

router.put(
  "/:ma_kh",
  authenticate,
  checkPermission("partners", "edit"),
  validate(brandSchema),
  controller.update,
);

router.delete(
  "/:ma_kh",
  authenticate,
  checkPermission("partners", "delete"),
  controller.remove,
);

module.exports = router;
