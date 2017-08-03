const wetty = require('./package.js');
const fs = require('fs');
const path = require('path');

const optimist = require('optimist');

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
      description: 'defaults to "password", you can use "publickey,password" instead',
    },
    port: {
      demand: false,
      alias: 'p',
      description: 'wetty listen port',
    },
    help: {
      demand     : false,
      alias      : 'h',
      description: 'Print help message',
    },
  })
  .boolean('allow_discovery').argv;

<<<<<<< HEAD
let runhttps = process.env.HTTPS || false;
let globalsshuser = process.env.SSHUSER || '';
let sshhost = process.env.SSHHOST || 'localhost';
let sshauth = process.env.SSHAUTH || 'password,keyboard-interactive';
let sshport = process.env.SSHPOST || 22;
let port = process.env.PORT || 3000;

if (opts.sshport) {
  sshport = opts.sshport;
}

if (opts.sshhost) {
  sshhost = opts.sshhost;
}

if (opts.sshauth) {
  sshauth = opts.sshauth;
}

if (opts.sshuser) {
  globalsshuser = opts.sshuser;
=======
if (opts.help) {
  optimist.showHelp();
  process.exit(0);
>>>>>>> Modularize the wetty service and add events (#18)
}

const globalsshuser = opts.sshuser || process.env.SSHUSER || '';
const sshhost = opts.sshhost || process.env.SSHHOST || 'localhost';
const sshauth = opts.sshauth || process.env.SSHAUTH || 'password';
const sshport = opts.sshport || process.env.SSHPOST || 22;
const port = opts.port || process.env.PORT || 3000;

if (opts.sslkey && opts.sslcert) {
  opts['ssl'] = {};
  opts.ssl['key'] = fs.readFileSync(path.resolve(opts.sslkey));
  opts.ssl['cert'] = fs.readFileSync(path.resolve(opts.sslcert));
}

process.on('uncaughtException', e => {
  console.error(`Error: ${e}`);
});

const e = wetty.serve(port, globalsshuser, sshhost, sshport, sshauth, opts.ssl);

e.on('exit', code => {
  console.log(`exit with code: ${code}`);
});

e.on('disconnect', () => {
  console.log('disconnect');
});
