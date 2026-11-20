import winston from 'winston';
import { defaultLogLevel } from '../config/defaults.js';
import { isDev } from '../config/environment.js';

const { combine, timestamp, label, simple, json, colorize } = winston.format;

const dev = combine(colorize(), label({ label: 'Wetty' }), timestamp(), simple());

const prod = combine(label({ label: 'Wetty' }), timestamp(), json());

let globalLogger = winston.createLogger({
  format: isDev ? dev : prod,
  transports: [
    // Winston's Console transport is a TransportStream; TS 7 misidentifies its
    // class instance when checking the inferred transport array type.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment
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
