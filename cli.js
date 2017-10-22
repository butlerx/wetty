import fs from 'fs-extra';
import path from 'path';
import optimist from 'optimist';
import wetty from './wetty';

const opts = optimist
  .options({
    sslkey: {
      demand     : false,
      description: 'path to SSL key',
    },
    sslcert: {
      demand     : false,
      description: 'path to SSL certificate',
    },
    sshhost: {
      demand     : false,
      description: 'ssh server host',
    },
    sshport: {
      demand     : false,
      description: 'ssh server port',
    },
    sshuser: {
      demand     : false,
      description: 'ssh user',
    },
    sshauth: {
      demand     : false,
      description: 'defaults to "password", you can use "publickey,password" instead',
    },
    port: {
      demand     : false,
      alias      : 'p',
      description: 'wetty listen port',
    },
    help: {
      demand     : false,
      alias      : 'h',
      description: 'Print help message',
    },
  })
  .boolean('allow_discovery').argv;

if (opts.help) {
  optimist.showHelp();
  process.exit(0);
}

const sshuser = opts.sshuser || process.env.SSHUSER || '';
const sshhost = opts.sshhost || process.env.SSHHOST || 'localhost';
const sshauth = opts.sshauth || process.env.SSHAUTH || 'password';
const sshport = opts.sshport || process.env.SSHPOST || 22;
const port = opts.port || process.env.PORT || 3000;

loadSSL(opts)
  .then(ssl => {
    opts.ssl = ssl;
  })
  .catch(err => {
    console.error(`Error: ${err}`);
    process.exit(1);
  });

process.on('uncaughtException', err => {
  console.error(`Error: ${err}`);
});

const tty = wetty(port, sshuser, sshhost, sshport, sshauth, opts.ssl);
tty.on('exit', code => {
  console.log(`exit with code: ${code}`);
});
tty.on('disconnect', () => {
  console.log('disconnect');
});

async function loadSSL({ sslkey, sslcert }) {
  try {
    if (sslkey && sslcert) {
      return {
        key : await fs.readFile(path.resolve(sslkey)),
        cert: await fs.readFile(path.resolve(sslcert)),
      };
    }
    return {};
  } catch (err) {
    throw err;
  }
}
