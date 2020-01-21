import * as yargs from 'yargs';
import { logger } from '../utils';
import WeTTy from '../wetty';
import { CLI } from './options';
import { unWrapArgs } from './parseArgs';

export default function init(opts: CLI): void {
  if (!opts.help) {
    const { ssh, server, command, forcessh, ssl } = unWrapArgs(opts);
    WeTTy(ssh, server, command, forcessh, ssl).catch(err => {
      logger.error(err);
      process.exitCode = 1;
    });
  } else {
    yargs.showHelp();
    process.exitCode = 0;
  }
}
