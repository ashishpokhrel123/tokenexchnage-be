// utils/logger.js
const winston = require('winston');

const bigIntFormat = winston.format((info) => {
  const convertBigInt = (obj) => {
    if (typeof obj === 'bigint') return obj.toString();
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        obj[key] = convertBigInt(obj[key]);
      }
    }
    return obj;
  };

  return convertBigInt(info);
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    bigIntFormat(), 
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      if (Object.keys(metadata).length > 0) {
        log += ` | Metadata: ${JSON.stringify(metadata)}`;
      }
      return log;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/token-controller.log' })
  ],
});

function log(level, message, metadata = {}) {
  logger.log({
    level,
    message,
    ...metadata
  });
}

const info = (message, metadata) => log('info', message, metadata);
const error = (message, metadata) => log('error', message, metadata);
const debug = (message, metadata) => log('debug', message, metadata);
const warn = (message, metadata) => log('warn', message, metadata);

module.exports = {
  log,
  info,
  error,
  debug,
  warn,
  logger
};