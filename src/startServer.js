var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var server = require('socket.io');
var pty = require('pty.js');

const createRoutes = () => {
  var app = express();
  app.get('/wetty/ssh/:user', function(req, res) {
    res.sendfile(__dirname + '/public/wetty/index.html');
  });
  app.use('/', express.static(path.join(__dirname, 'public')));
  return app;
};

const getUsername = (theArgs, request) => {
  var sshuser = '';
  const match = request.headers.referer.match('/wetty/ssh/.+$');
  if (match) {
    sshuser = match[0].replace('/wetty/ssh/', '') + '@';
  } else if (theArgs.globalsshuser) {
    sshuser = theArgs.globalsshuser + '@';
  }
  return sshuser;

};

const startTerminal = (theArgs, sshuser, onTerminalStart) => {
  var term;
  if (process.getuid() == 0) {
    term = pty.spawn('/bin/login', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30
    });
  } else {
    term = pty.spawn('ssh', [sshuser + theArgs.sshhost, '-p', theArgs.sshport, '-o', 'PreferredAuthentications=' + theArgs.sshauth], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30
    });
  }
  return term;
};

const startServer = (theArgs, { onConnectionAccepted, onServerListen, onTerminalStart, onTerminalExit }) => {

  const app = createRoutes();

  var httpserv;
  if (theArgs.runhttps) {
    httpserv = https.createServer(theArgs.ssl, app).listen(theArgs.port, () => { onServerListen(true); });
  } else {
    httpserv = http.createServer(app).listen(theArgs.port, () => { onServerListen(false); });
  }

  var io = server(httpserv,{path: '/wetty/socket.io'});
  io.on('connection', function(socket){
    onConnectionAccepted();

    const sshuser = getUsername(theArgs, socket.request);

    const term = startTerminal(theArgs, sshuser, onTerminalStart );
    onTerminalStart();
    term.on('data', function(data) {
      socket.emit('output', data);
    });
    term.on('exit', function(code) {
      onTerminalExit();
    });
    socket.on('resize', function(data) {
      term.resize(data.col, data.row);
    });
    socket.on('input', function(data) {
      term.write(data);
    });
    socket.on('disconnect', function() {
      term.end();
    });
  })

};

module.exports = startServer;
