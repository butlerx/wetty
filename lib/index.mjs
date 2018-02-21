import optimist from 'optimist';
import logger from './logger.mjs';
import wetty from './emitter.mjs';

const opts = optimist
  .options({
    sslkey: {
      demand: false,
      description: 'path to SSL key',
    },
    sslcert: {
      demand: false,
      description: 'path to SSL certificate',
    },
    sshhost: {
      demand: false,
      description: 'ssh server host',
    },
    sshport: {
      demand: false,
      description: 'ssh server port',
    },
    sshuser: {
      demand: false,
      description: 'ssh user',
    },
    sshauth: {
      demand: false,
      description:
        'defaults to "password", you can use "publickey,password" instead',
    },
    port: {
      demand: false,
      alias: 'p',
      description: 'wetty listen port',
    },
    help: {
      demand: false,
      alias: 'h',
      description: 'Print help message',
    },
  })
  .boolean('allow_discovery').argv;

export default class {
  static start({
    sshuser = process.env.SSHUSER || '',
    sshhost = process.env.SSHHOST || 'localhost',
    sshauth = process.env.SSHAUTH || 'password',
    sshport = process.env.SSHPOST || 22,
    port = process.env.PORT || 3000,
    sslkey,
    sslcert,
  }) {
    wetty
      .on('exit', ({ code, msg }) => {
        logger.info(`Exit with code: ${code} ${msg}`);
      })
      .on('disconnect', () => {
        logger.info('disconnect');
      })
      .on('spawn', ({ msg }) => logger.info(msg))
      .on('connection', ({ msg, date }) => logger.info(`${date} ${msg}`))
      .on('server', ({ msg }) => logger.info(msg))
      .on('debug', msg => logger.debug(msg));
    return wetty.start(
      {
        user: sshuser,
        host: sshhost,
        auth: sshauth,
        port: sshport,
      },
      port,
      { key: sslkey, cert: sslcert }
    );
  }

  static get wetty() {
    return wetty;
  }

  static init() {
    if (!opts.help) {
      this.start(opts).catch(err => {
        logger.error(err);
        process.exitCode = 1;
      });
    } else {
      optimist.showHelp();
      process.exitCode = 0;
    }
  }
}
