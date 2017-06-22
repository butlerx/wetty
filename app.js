const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const server = require('socket.io');
const pty = require('pty.js');
const fs = require('fs');

const opts = require('optimist')
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
  })
  .boolean('allow_discovery').argv;

let runhttps = process.env.HTTPS || false;
let globalsshuser = process.env.SSHUSER || '';
let sshhost = process.env.SSHHOST || 'localhost';
let sshauth = process.env.SSHAUTH || 'password';
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
}

if (opts.port) {
  port = opts.port;
}

if (opts.sslkey && opts.sslcert) {
  runhttps = true;
  opts['ssl'] = {};
  opts.ssl['key'] = fs.readFileSync(path.resolve(opts.sslkey));
  opts.ssl['cert'] = fs.readFileSync(path.resolve(opts.sslcert));
}

process.on('uncaughtException', e => {
  console.error(`Error: ${e}`);
});

let httpserv;

const app = express();
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

if (runhttps) {
  httpserv = https.createServer(opts.ssl, app).listen(port, () => {
    console.log(`https on port ${port}`);
  });
} else {
  httpserv = http.createServer(app).listen(port, () => {
    console.log(`http on port ${port}`);
  });
}

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
    term = pty.spawn('/bin/login', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
    });
  } else if (sshuser) {
    term = pty.spawn('ssh', [sshuser + sshhost, '-p', sshport, '-o', `PreferredAuthentications=${sshauth}`], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
    });
  } else {
    term = pty.spawn('./bin/ssh', [sshhost, '-p', sshport, '-o', `PreferredAuthentications=${sshauth}`], {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
    });
  }

  console.log(`${new Date()} PID=${term.pid} STARTED on behalf of user=${sshuser}`);
  term.on('data', data => {
    socket.emit('output', data);
  });
  term.on('exit', code => {
    console.log(`${new Date()} PID=${term.pid} ENDED`);
    socket.emit('logout');
  });
  socket.on('resize', ({ col, row }) => {
    term.resize(col, row);
  });
  socket.on('input', data => {
    term.write(data);
  });
  socket.on('disconnect', () => {
    term.end();
  });
});
