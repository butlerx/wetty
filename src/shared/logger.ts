import winston from 'winston';

import { isDev } from './env.js';

const { combine, timestamp, label, simple, json, colorize } = winston.format;

const dev = combine(
  colorize(),
  label({ label: 'Wetty' }),
  timestamp(),
  simple(),
);

const prod = combine(label({ label: 'Wetty' }), timestamp(), json());

export const logger = winston.createLogger({
  format: isDev ? dev : prod,
  transports: [
    new winston.transports.Console({
      level: isDev ? 'debug' : 'info',
      handleExceptions: true,
    }),
  ],
});
