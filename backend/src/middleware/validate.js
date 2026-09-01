const AppError = require('../utils/AppError');

/**
 * Validation middleware using Zod schemas
 * Validates request body, params, and query against provided schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    next();
  } catch (error) {
    const errors = error.errors ? error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    })) : [];
    const message = errors.length
      ? errors.map((e) => `${e.path}: ${e.message}`).join(', ')
      : 'Validation failed';
    next(new AppError(message, 422, errors));
  }
};

module.exports = validate;