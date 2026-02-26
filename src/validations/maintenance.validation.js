const Joi = require("joi");

const maintenanceValidation = {
  create: {
    body: Joi.object({
      ma_phieu: Joi.string().required(),
      ma_serial: Joi.string().required(),
      ma_doi_tac: Joi.string().required(),
      so_km_hien_tai: Joi.number().integer().min(0).required(),
      tong_tien: Joi.number().min(0).default(0),
      ghi_chu: Joi.string().allow("", null),
      chi_tiet: Joi.array().items(
        Joi.object({
          ma_hang_hoa: Joi.string().allow(null, ""),
          ten_hang_muc: Joi.string().required(),
          loai_hang_muc: Joi.string().valid("PHU_TUNG", "DICH_VU").required(),
          so_luong: Joi.number().precision(2).default(1),
          don_gia: Joi.number().precision(2).default(0),
          thanh_tien: Joi.number().precision(2).default(0),
          ghi_chu: Joi.string().allow("", null),
        }),
      ),
    }),
  },
};

module.exports = maintenanceValidation;
