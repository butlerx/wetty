const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const server = require('socket.io');
const pty = require('pty.js');
const EventEmitter = require('events');
const favicon = require('serve-favicon');

const app = express();
app.use(favicon(`${__dirname}/public/favicon.ico`));
// For using wetty at /wetty on a vhost
app.get('/wetty/ssh/:user', (req, res) => {
  res.sendfile(`${__dirname}/public/wetty/index.html`);
});
app.get('/wetty/', (req, res) => {
  res.sendfile(`${__dirname}/public/wetty/index.html`);
});
// For using wetty on a vhost by itself
app.get('/ssh/:user', (req, res) => {
  res.sendfile(`${__dirname}/public/wetty/index.html`);
});
app.get('/', (req, res) => {
  res.sendfile(`${__dirname}/public/wetty/index.html`);
});
// For serving css and javascript
app.use('/', express.static(path.join(__dirname, 'public')));

function createServer(port, sslopts) {
  return sslopts && sslopts.key && sslopts.cert
    ? https.createServer(sslopts, app).listen(port, () => {
      console.log(`https on port ${port}`);
    })
    : http.createServer(app).listen(port, () => {
      console.log(`http on port ${port}`);
    });
}

exports.serve = (port, globalsshuser, sshhost, sshport, sshauth, sslopts) => {
  const httpserv = createServer(port, sslopts);

  const events = new EventEmitter();
  const io = server(httpserv, { path: '/wetty/socket.io' });
  io.on('connection', socket => {
    const request = socket.request;
    console.log(`${new Date()} Connection accepted.`);
    const match = request.headers.referer.match('.+/ssh/.+$');
    const ssh = match
      ? `${match[0].split('/ssh/').pop()}@${sshhost}`
      : globalsshuser
        ? `${globalsshuser}@${sshhost}`
        : sshhost;

    const args =
      process.getuid() === 0 && sshhost === 'localhost'
        ? ['login']
        : [ssh, '-p', sshport, '-o', `PreferredAuthentications=${sshauth}`];
    const term = pty.spawn('/usr/bin/env', args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
    });

    console.log(`${new Date()} PID=${term.pid} STARTED on behalf of user=${ssh}`);
    term.on('data', data => {
      socket.emit('output', data);
    });
    term.on('exit', code => {
      console.log(`${new Date()} PID=${term.pid} ENDED`);
      socket.emit('logout');
      events.emit('exit', code);
    });
    socket.on('resize', ({ col, row }) => {
      term.resize(col, row);
    });
    socket.on('input', term.write);
    socket.on('disconnect', () => {
      term.end();
      events.emit('disconnect');
    });
  });

  return events;
};
