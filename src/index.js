var getSSLSettings = require('./getSSLSettings.js');
var startServer = require('./startServer');

process.on('uncaughtException', function(e) {
  console.error('Error: ' + e);
});


const runApp = () => {
  const SSLSettings = getSSLSettings();
  startServer(SSLSettings, {
    onConnectionAccepted: () => {
      console.log((new Date()) + ' Connection accepted.');
    },
    onServerListen: isHttp => {
      console.log('https on port ' + SSLSettings.port);
    },
    onTerminalExit: () => {
      console.log((new Date()) + " PID=" + term.pid + " ENDED");
    },
    onTerminalStart: () => {
      console.log((new Date()) + " PID=" + term.pid + " STARTED on behalf of user=" + sshuser)
    },
  });
};


module.exports = {
  runApp,
  startServer,
};



//wetty.startSSLServer({ port: 3000 })