const optimist = require('optimist');
const path = require('path');

const getDefaultSSLArgs = () => {
  return ({
    runhttps: false,
    sshport: 22,
    sshhost: 'localhost',
    sshauth: 'password',
    globalsshuser: '',
    port: undefined,
    ssl: undefined,
  });
};

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

const getSSLArgsFromCommandLine = () => {
  const defaultArgs = getDefaultSSLArgs();
  const opts = getOptions();

  const args = {
    runhttps: (opts.sslkey && opts.sslcert) ? true: defaultArgs.runhttps,
    sshport: opts.sshport ? opts.sshport: defaultArgs.sshport,
    sshhost: opts.sshhost ? opts.sshhost: defaultArgs.sshhost,
    sshauth: opts.sshauth ? opts.sshauth : defaultArgs.sshauth,
    globalsshuser: opts.sshuser? opts.sshuser: defaultArgs.globalsshuser,
    port:  opts.port ? opts.port: defaultArgs.port,
    ssl: (opts.sslkey && opts.sslcert) ? { key: opts.sslkey, cert: opts.sslcert} : undefined,
  };
  return args;
};

module.exports = {
  getSSLArgsFromCommandLine,
  getDefaultSSLArgs,
};

