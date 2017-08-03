const wetty = require('./package.js');
const fs = require('fs');
const path = require('path');

const optimist = require('optimist');

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
