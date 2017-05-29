const process = require('process');
const startServer = require('./startServer');
const getSSLArgsFromCommandLine = require('./getSSLSettings.js').getSSLArgsFromCommandLine;
const getDefaultSSLArgs = require('./getSSLSettings').getDefaultSSLArgs;

const runApp = () => {
  process.on('uncaughtException', function(e) {
    console.error('Wetty Error: ' + e);
  });

  const SSLSettings = getSSLArgsFromCommandLine();
  startServer(SSLSettings, {
    onConnectionAccepted: () => {
      console.log((new Date()) + ' Connection accepted.');
    },
    onServerListen: isHttp => {
      console.log('https on port ' + SSLSettings.port);
    },
    onTerminalStart: (term, sshuser) => {
      console.log((new Date()) + " PID=" + term.pid + " STARTED on behalf of user=" + sshuser)
    },
    onTerminalExit: term => {
      console.log((new Date()) + " PID=" + term.pid + " ENDED");
    },
  });
};

const startSSH = (settings, hooks) => {
  const defaultSSHSettings = Object.assign(getDefaultSSLArgs(), settings);
  return startServer(defaultSSHSettings, hooks || {});
};

module.exports = {
  runApp,
  startSSH,
};
