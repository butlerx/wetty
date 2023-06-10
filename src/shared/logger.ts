import winston from 'winston';
import { defaultLogLevel } from './defaults.js';
import { isDev } from './env.js';

const { combine, timestamp, label, simple, json, colorize } = winston.format;

const dev = combine(
  colorize(),
  label({ label: 'Wetty' }),
  timestamp(),
  simple(),
);

const prod = combine(label({ label: 'Wetty' }), timestamp(), json());

let globalLogger = winston.createLogger({
  format: isDev ? dev : prod,
  transports: [
    new winston.transports.Console({
      level: defaultLogLevel,
      handleExceptions: true,
    }),
  ],
});

export function setLevel(level: typeof winston.level): void {
  globalLogger = winston.createLogger({
    format: isDev ? dev : prod,
    transports: [
      new winston.transports.Console({
        level,
        handleExceptions: true,
      }),
    ],
  });
}

export function logger(): winston.Logger {
  return globalLogger;
}
