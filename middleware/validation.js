const validateRequest = (schema, location = 'body') => {
  return (req, res, next) => {
    const data = location === 'query' ? req.query : req.body;
    const errors = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = data[key];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type === 'number' && isNaN(Number(value))) {
          errors.push(`${key} must be a number`);
        } else if (rules.type === 'boolean' && !['true','false'].includes(value)) {
          errors.push(`${key} must be a boolean`);
        }
        // Add more type checks as needed
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request parameters",
          details: errors
        }
      });
    }

    next();
  };
};

module.exports = { validateRequest };