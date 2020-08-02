import { createLogger, format, transports } from 'winston';

const { combine, timestamp, label, simple, json, colorize } = format;

const dev = combine(
  colorize(),
  label({ label: 'Wetty' }),
  timestamp(),
  simple()
);

const prod = combine(label({ label: 'Wetty' }), timestamp(), json());

export const logger = createLogger({
  format: process.env.NODE_ENV === 'development' ? dev : prod,
  transports: [
    new transports.Console({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      handleExceptions: true,
    }),
  ],
});
