/**
 * Custom application error class
 * Used for consistent error handling across the API
 */
class AppError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = Array.isArray(errors) ? errors : [errors];

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;