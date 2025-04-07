// ./middleware/auditService.js
const logAudit = async (eventType, error = null, userAddress = null, details = {}) => {
  console.log(`[AUDIT] ${eventType} by ${userAddress || 'system'}:`, {
    timestamp: new Date().toISOString(),
    ...details,
    ...(error && { error: error.message })
  });
};

module.exports = { logAudit };