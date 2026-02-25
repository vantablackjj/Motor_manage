const Joi = require("joi");

const themXeSchema = Joi.object({
  ma_loai_xe: Joi.string().max(50).required(),
  ma_mau: Joi.string().max(50).allow(null, ""),
  so_khung: Joi.string().max(100).required(),
  so_may: Joi.string().max(100).required(),
  ma_kho_hien_tai: Joi.string().max(50).required(),
  ngay_nhap: Joi.date().optional(),
  gia_nhap: Joi.number().min(0).optional(),
  ghi_chu: Joi.string().allow("", null).optional(),
});

const capNhatXeSchema = Joi.object({
  ma_loai_xe: Joi.string().max(50),
  ma_mau: Joi.string().max(50).allow(null),
  so_khung: Joi.string().max(100),
  so_may: Joi.string().max(100),
  bien_so: Joi.string().max(50).allow(null),
  gia_nhap: Joi.number().min(0),
  ghi_chu: Joi.string().allow("", null),
}).min(1);

const checkDuplicateSchema = Joi.object({
  so_khung: Joi.string().max(100).required(),
  so_may: Joi.string().max(100).required(),
  exclude_id: Joi.number().integer().optional(),
});

module.exports = {
  themXeSchema,
  capNhatXeSchema,
  checkDuplicateSchema,
};
