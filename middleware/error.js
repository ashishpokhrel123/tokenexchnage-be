const { ApiError } = require('../utils/ApiError');
const httpStatus = require('http-status');

/**
 * Convert error to ApiError if it isn't already
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    const statusCode = 
      error.statusCode || 
      (error.status && Number.isInteger(error.status) ? error.status : httpStatus.INTERNAL_SERVER_ERROR);
    
    const message = error.message || httpStatus[statusCode] || 'Something went wrong';
    
    // Preserve original error stack and additional properties
    error = new ApiError(statusCode, message, {
      isOperational: false,
      stack: error.stack,
      ...(error.details && { details: error.details })
    });
  }
  
  next(error);
};

/**
 * Handle all errors and send appropriate response
 */
const errorHandler = (err, req, res, next) => {
  const { statusCode = httpStatus.INTERNAL_SERVER_ERROR, message } = err;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    status: 'error',
    statusCode,
    message,
    ...(isDevelopment && { stack: err.stack }),
    ...(err.details && { details: err.details })
  };

  // Optionally log the error
  if (isDevelopment) {
    console.error(err);
  }

  res.status(statusCode).json(response);
};

module.exports = {
  errorConverter,
  errorHandler
};