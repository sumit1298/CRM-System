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
    const message = error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    next(new AppError(message, 422));
  }
};

module.exports = validate;