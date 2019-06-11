import * as yargs from 'yargs';
import logger from './logger';
import wetty from './emitter';
import WeTTy from './wetty';

export interface Options {
  sshhost: string;
  sshport: number;
  sshuser: string;
  sshauth: string;
  sshkey?: string;
  sshpass?: string;
  sslkey?: string;
  sslcert?: string;
  base: string;
  host: string;
  port: number;
  title: string;
  command?: string;
  bypasshelmet?: boolean;
}

interface CLI extends Options {
  help: boolean;
}

export default class Server {
  public static start({
    sshuser,
    sshhost,
    sshauth,
    sshport,
    sshkey,
    sshpass,
    base,
    host,
    port,
    title,
    command,
    sslkey,
    sslcert,
    bypasshelmet,
  }: Options): Promise<void> {
    wetty
      .on('exit', ({ code, msg }: { code: number; msg: string }) => {
        logger.info(`Exit with code: ${code} ${msg}`);
      })
      .on('disconnect', () => {
        logger.info('disconnect');
      })
      .on('spawn', ({ msg }) => logger.info(msg))
      .on('connection', ({ msg, date }) => logger.info(`${date} ${msg}`))
      .on('server', ({ msg }) => logger.info(msg))
      .on('debug', (msg: string) => logger.debug(msg));
    return wetty.start(
      {
        user: sshuser,
        host: sshhost,
        auth: sshauth,
        port: sshport,
        title,
        pass: sshpass,
        key: sshkey,
      },
      { base, host, port, title, bypasshelmet },
      command,
      { key: sslkey, cert: sslcert }
    );
  }

  public static get wetty(): WeTTy {
    return wetty;
  }

  public static init(opts: CLI): void {
    if (!opts.help) {
      this.start(opts).catch(err => {
        logger.error(err);
        process.exitCode = 1;
      });
    } else {
      yargs.showHelp();
      process.exitCode = 0;
    }
  }
}
