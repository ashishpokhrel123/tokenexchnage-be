/**
 * Formats a successful response with data and a message.
 * @param {any} data - The data to include in the response.
 * @param {string} [message="Operation successful"] - The success message.
 * @returns {Object} - Formatted success response object.
 */
const formatSuccessResponse = (data, message = "Operation successful") => {
  return {
    status: "success",
    message,
    data,
  };
};

/**
 * Formats an error response with a message and status code.
 * @param {string} message - The error message.
 * @param {number} [statusCode=500] - The HTTP status code (default: 500).
 * @returns {Object} - Formatted error response object.
 */
const formatErrorResponse = (message, statusCode = 500) => {
  return {
    status: "error",
    message,
    statusCode,
  };
};

module.exports = {
  formatSuccessResponse,
  formatErrorResponse,
};
