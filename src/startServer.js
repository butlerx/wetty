const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const server = require('socket.io');
const pty = require('pty.js');
const fs = require('fs');

const createRoutes = () => {
  const app = express();
  app.get('/wetty/ssh/:user', (req, res) => {
    res.sendfile(__dirname + '/public/wetty/index.html');
  });
  app.use('/', express.static(path.join(__dirname, 'public')));
  return app;
};

const getUsername = (theArgs, request) => {
  let sshuser = '';
  const match = request.headers.referer.match('/wetty/ssh/.+$');
  if (match) {
    sshuser = match[0].replace('/wetty/ssh/', '') + '@';
  } else if (theArgs.globalsshuser) {
    sshuser = theArgs.globalsshuser + '@';
  }
  return sshuser;
};

const startTerminal = (theArgs, sshuser) => {
  let term;
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

const readSSLOptions = sslOpts => ({
  key:  fs.readFileSync(path.resolve(opts.sslkey)),
  cert: fs.readFileSync(path.resolve(opts.sslcert)),
});

const startServer = (theArgs, { onConnectionAccepted, onServerListen, onTerminalStart, onTerminalExit }) => {
  const app = createRoutes();

  let httpserv;
  if (theArgs.runhttps) {
    httpserv = https.createServer(readSSLOptions(theArgs.ssl), app).listen(theArgs.port, () => { if (onServerListen) {onServerListen(true); }});
  } else {
    httpserv = http.createServer(app).listen(theArgs.port, () => { if (onServerListen) { onServerListen(false); }});
  }

  const io = server(httpserv,{path: '/wetty/socket.io'});
  io.on('connection', (socket) => {
    if (onConnectionAccepted){
      onConnectionAccepted();
    }

    const sshuser = getUsername(theArgs, socket.request);

    const term = startTerminal(theArgs, sshuser);
    console.log('term: ', term);
    if (onTerminalStart){
      onTerminalStart(term, sshuser);
    }
    term.on('data', (data) => {
      socket.emit('output', data);
    });
    term.on('exit', (code) => {
      if (onTerminalExit){
        onTerminalExit(term);
      }
    });
    socket.on('resize', (data) => {
      term.resize(data.col, data.row);
    });
    socket.on('input', (data) => {
      term.write(data);
    });
    socket.on('disconnect', () => {
      term.end();
    });
  })
  return httpserv;
};

module.exports = startServer;
