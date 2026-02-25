const Joi = require("joi");

const createKhoSchema = Joi.object({
  ma_kho: Joi.string().max(50),
  ten_kho: Joi.string().required().max(200),
  dia_chi: Joi.string().max(500).allow("", null),
  dien_thoai: Joi.string().max(50).allow("", null),
  loai_kho: Joi.string().valid("CHINH", "DAILY").required(),
  mac_dinh: Joi.boolean().default(false),
  ghi_chu: Joi.string().allow("", null),
});

const updateKhoSchema = Joi.object({
  ten_kho: Joi.string().required().max(200),
  dia_chi: Joi.string().max(500).allow("", null),
  dien_thoai: Joi.string().max(50).allow("", null),
  mac_dinh: Joi.boolean(),
  chinh: Joi.boolean(),
  daily: Joi.boolean(),
  ghi_chu: Joi.string().allow("", null),
}).min(1);

module.exports = {
  createKhoSchema,
  updateKhoSchema,
};
