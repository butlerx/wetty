import { createLogger, format, transports } from 'winston';

const { combine, timestamp, label, simple, json, colorize } = format;

const logger = createLogger({
  format: combine(
    colorize({ all: process.env.NODE_ENV === 'development' }),
    label({ label: 'Wetty' }),
    timestamp(),
    process.env.NODE_ENV === 'development' ? simple() : json()
  ),
  transports: [
    new transports.Console({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      handleExceptions: true,
    }),
  ],
});

logger.stream = {
  write(message: string): void {
    logger.info(message);
  },
};

export default logger;
