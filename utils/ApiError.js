// utils/ApiError.js
/**
 * Custom API error handling class extending the built-in Error class.
 * Used to represent operational or programmatic errors with HTTP status codes.
 */
class ApiError extends Error {
  /**
   * Creates an instance of ApiError.
   * @param {number} statusCode The HTTP status code for the error (e.g., 400, 404, 500).
   * @param {string} message The error message describing the issue.
   * @param {boolean} [isOperational=true] Indicates if the error is operational (true) or programmatic (false).
   * @param {string} [stack=""] Optional custom stack trace.
   */
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);

    Object.setPrototypeOf(this, ApiError.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;