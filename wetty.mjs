import express from 'express';
import http from 'http';
import https from 'https';
import path from 'path';
import server from 'socket.io';
import pty from 'pty.js';
import EventEmitter from 'events';
import favicon from 'serve-favicon';

const app = express();
app.use(favicon(`${__dirname}/public/favicon.ico`));
// For using wetty at /wetty on a vhost
app.get('/wetty/ssh/:user', (req, res) => {
  res.sendFile(`${__dirname}/public/wetty/index.html`);
});
app.get('/wetty/', (req, res) => {
  res.sendFile(`${__dirname}/public/wetty/index.html`);
});
// For using wetty on a vhost by itself
app.get('/ssh/:user', (req, res) => {
  res.sendFile(`${__dirname}/public/wetty/index.html`);
});
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/public/wetty/index.html`);
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

function getCommand(socket, sshuser, sshhost, sshport, sshauth) {
  const request = socket.request;
  const match = request.headers.referer.match('.+/ssh/.+$');
  const sshAddress = sshuser ? `${sshuser}@${sshhost}` : sshhost;
  const ssh = match ? `${match[0].split('/ssh/').pop()}@${sshhost}` : sshAddress;
  const args =
    process.getuid() === 0 && sshhost === 'localhost'
      ? ['login', '-h', socket.client.conn.remoteAddress.split(':')[3]]
      : ['bin/ssh', ssh, '-p', sshport, '-o', `PreferredAuthentications=${sshauth}`];
  return [args, ssh];
}

export default function start(port, sshuser, sshhost, sshport, sshauth, sslopts) {
  const httpserv = createServer(port, sslopts);
  const events = new EventEmitter();
  const io = server(httpserv, { path: '/wetty/socket.io' });
  io.on('connection', socket => {
    console.log(`${new Date()} Connection accepted.`);
    const [args, ssh] = getCommand(socket, sshuser, sshhost, sshport, sshauth);
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
    socket.on('resize', ({ col, row }) => term.resize(col, row));
    socket.on('input', input => term.write(input));
    socket.on('disconnect', () => {
      term.end();
      term.destroy();
      events.emit('disconnect');
    });
  });
  return events;
}
