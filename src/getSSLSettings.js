const optimist = require('optimist');
const path = require('path');

const getOptions = () => {
  return (
    optimist
      .options({
        sslkey: {
          demand: false,
          description: 'path to SSL key'
        },
        sslcert: {
          demand: false,
          description: 'path to SSL certificate'
        },
        sshhost: {
          demand: false,
          description: 'ssh server host'
        },
        sshport: {
          demand: false,
          description: 'ssh server port'
        },
        sshuser: {
          demand: false,
          description: 'ssh user'
        },
        sshauth: {
          demand: false,
          description: 'defaults to "password", you can use "publickey,password" instead'
        },
        port: {
          demand: true,
          alias: 'p',
          description: 'wetty listen port'
        },
      }).boolean('allow_discovery').argv
  );
};

const getSSLObject = opts => {
  if (opts.sslkey && opts.sslcert){
    return ({
      key:  fs.readFileSync(path.resolve(opts.sslkey)),
      cert: fs.readFileSync(path.resolve(opts.sslcert)),
    });
  }
  return undefined;
};

const getArgs = opts => {
  const args = {
    runhttps: (opts.sslkey && opts.sslcert) ? true: false,
    sshport: opts.sshport ? opts.sshport: 22,
    sshhost: opts.sshhost ? opts.sshhost: 'localhost',
    sshauth: opts.sshauth ? opts.sshauth : 'password',
    globalsshuser: opts.sshuser? opts.sshuser: '',
    ssl: getSSLObject(opts),
    port:  opts.port,
  };
  return args;
};

module.exports = () => getArgs(getOptions());

