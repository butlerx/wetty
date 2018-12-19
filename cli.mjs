import fs from 'fs-extra';
import path from 'path';
import optimist from 'optimist';
import wetty from './wetty';

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
    sshpass: {
      demand: false,
      description: 'ssh password',
    },
    sshauth: {
      demand: false,
      description: 'defaults to "password", you can use "publickey,password" instead',
    },
    sshkey: {
      demand: false,
      description:
        'path to an optional client private key (connection will be password-less and insecure!)',
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

if (opts.help) {
  optimist.showHelp();
  process.exit(0);
}

const sshuser = opts.sshuser || process.env.SSHUSER || '';
const sshpass = opts.sshpass || process.env.SSHPASS || '';
const sshhost = opts.sshhost || process.env.SSHHOST || 'localhost';
const sshauth = opts.sshauth || process.env.SSHAUTH || 'password,keyboard-interactive';
const sshport = opts.sshport || process.env.SSHPORT || 22;
const sshkey = opts.sshkey || process.env.SSHKEY || '';
const port = opts.port || process.env.PORT || 3000;

loadSSL(opts)
  .then(ssl => {
    opts.ssl = ssl;
  })
  .catch(err => {
    console.error(`Error: ${err}`);
    process.exit(1);
  });

const sshkeyWarning = `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
! Password-less auth enabled using private key from ${sshkey}.
! This is dangerous, anything that reaches the wetty server
! will be able to run remote operations without authentication.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`;
if (sshkey) {
  console.warn(sshkeyWarning);
}

process.on('uncaughtException', err => {
  console.error(`Error: ${err}`);
});

const tty = wetty(port, sshuser, sshpass, sshhost, sshport, sshauth, sshkey, opts.ssl);
tty.on('exit', code => {
  console.log(`exit with code: ${code}`);
});
tty.on('disconnect', () => {
  console.log('disconnect');
});

function loadSSL({ sslkey, sslcert }) {
  return new Promise((resolve, reject) => {
    const ssl = {};
    if (sslkey && sslcert) {
      fs
        .readFile(path.resolve(sslkey))
        .then(key => {
          ssl.key = key;
        })
        .then(fs.readFile(path.resolve(sslcert)))
        .then(cert => {
          ssl.cert = cert;
        })
        .then(resolve(ssl))
        .catch(reject);
    }
    resolve(ssl);
  });
}
