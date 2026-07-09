#!/usr/bin/env node

/**
 * Create WeTTY server
 * @module WeTTy
 *
 * This is the cli Interface for wetty.
 */
import { unlinkSync, existsSync, lstatSync } from 'fs';
import { createRequire } from 'module';
import { buildCli } from './config/cli.js';
import { loadConfigFile, mergeCliConf } from './config/config.js';
import { setLevel, logger } from './config/logger.js';
import { start } from './server.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as {
  name: string;
  version: string;
};

const yargsInstance = buildCli(packageJson.name, packageJson.version);
const opts = yargsInstance.parseSync();

function cleanup() {
  if (opts.socket) {
    const { socket } = opts;
    if (existsSync(socket) && lstatSync(socket).isSocket()) {
      unlinkSync(socket);
    }
  }
}
function exit() {
  process.exit(1);
}

if (!opts.help) {
  process.on('SIGINT', exit);
  process.on('exit', cleanup);
  void loadConfigFile(opts.conf)
    .then((config) => mergeCliConf(opts, config))
    .then(async (conf) => {
      setLevel(conf.logLevel);
      const handle = await start(
        conf.ssh,
        conf.server,
        conf.command,
        conf.forceSSH,
        conf.ssl,
      );
      await handle.wait();
    })
    .catch((err: unknown) => {
      logger().error('error in server', { err });
      process.exitCode = 1;
    });
} else {
  yargsInstance.showHelp();
  process.exitCode = 0;
}
