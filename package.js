const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const server = require('socket.io');
const pty = require('pty.js');
const EventEmitter = require('events');

const app = express();
app.use(require('serve-favicon')(`${__dirname}/public/favicon.ico`));
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
  if (sslopts && sslopts.key && sslopts.cert) {
    return https.createServer(sslopts, app).listen(port, () => {
      console.log(`https on port ${port}`);
    });
  }

  return http.createServer(app).listen(port, () => {
    console.log(`http on port ${port}`);
  });
}

exports.serve = function(port, globalsshuser, sshhost, sshport, sshauth, sslopts) {
  const httpserv = createServer(port, sslopts);

  const events = new EventEmitter();
  const io = server(httpserv, { path: '/wetty/socket.io' });
  io.on('connection', socket => {
    let sshuser = '';
    const request = socket.request;
    console.log(`${new Date()} Connection accepted.`);
    const match = request.headers.referer.match('.+/ssh/.+$');
    if (match) {
      sshuser = `${match[0].split('/ssh/').pop()}@`;
    } else if (globalsshuser) {
      sshuser = `${globalsshuser}@`;
    }

    let term;
    if (process.getuid() === 0 && sshhost === 'localhost') {
      term = pty.spawn('/usr/bin/env', ['login'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
      });
    } else if (sshuser) {
      term = pty.spawn(
        'ssh',
        [sshuser + sshhost, '-p', sshport, '-o', `PreferredAuthentications=${sshauth}`],
        {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
        },
      );
    } else {
      term = pty.spawn(
        './bin/ssh',
        [sshhost, '-p', sshport, '-o', `PreferredAuthentications=${sshauth}`],
        {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
        },
      );
    }

    console.log(`${new Date()} PID=${term.pid} STARTED on behalf of user=${sshuser}`);
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
    socket.on('input', data => {
      term.write(data);
    });
    socket.on('disconnect', () => {
      term.end();
      events.emit('disconnect');
    });
  });

  return events;
};
