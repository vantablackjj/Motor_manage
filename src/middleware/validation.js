
const Joi = require('joi');
const { sendError } = require('../ultils/respone');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return sendError(res, 'Validation error', 400, { errors });
    }

    req.body = value;
    next();
  };
};// Common schemas
const schemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

module.exports = { validate, schemas };
