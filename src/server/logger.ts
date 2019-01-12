import { createLogger, format, transports } from 'winston';

const { combine, timestamp, label, printf, colorize } = format;

const logger = createLogger({
  format:
    process.env.NODE_ENV === 'development'
      ? combine(
          colorize({ all: true }),
          label({ label: 'Wetty' }),
          timestamp(),
          printf(
            info =>
              `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`
          )
        )
      : format.json(),
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
