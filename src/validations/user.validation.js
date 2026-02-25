const Joi = require("joi");

const createUserSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().min(6).required(),
  ho_ten: Joi.string().required(),
  email: Joi.string().email().allow(null, ""),
  dien_thoai: Joi.string().allow(null, ""),
  vai_tro: Joi.string().required(),
  ma_kho: Joi.string().allow(null),
});

const updateUserSchema = Joi.object({
  ho_ten: Joi.string(),
  email: Joi.string().email().allow(null, ""),
  dien_thoai: Joi.string().allow(null, ""),
  vai_tro: Joi.string(),
  ma_kho: Joi.string().allow(null),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
};
