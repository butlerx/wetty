import { spawn } from 'node-pty';
import { isUndefined } from 'lodash';
import events from './emitter.mjs';

const xterm = {
  name: 'xterm-256color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env,
};

export default class Term {
  static spawn(socket, args) {
    const term = spawn('/usr/bin/env', args, xterm);
    const address = args[0] === 'ssh' ? args[1] : 'localhost';
    events.spawned(term.pid, address);
    socket.emit('login');
    term.on('exit', code => {
      events.exited(code, term.pid);
      socket
        .emit('logout')
        .removeAllListeners('disconnect')
        .removeAllListeners('resize')
        .removeAllListeners('input');
    });
    term.on('data', data => {
      socket.emit('data', data);
    });
    socket
      .on('resize', ({ cols, rows }) => {
        term.resize(cols, rows);
      })
      .on('input', input => {
        if (!isUndefined(term)) term.write(input);
      })
      .on('disconnect', () => {
        term.end();
        term.destroy();
        events.exited();
      });
  }

  static login(socket) {
    const term = spawn(
      '/usr/bin/env',
      ['node', '-r', '@std/esm', './lib/buffer.mjs'],
      xterm
    );
    let buf = '';
    return new Promise((resolve, reject) => {
      term.on('exit', () => {
        resolve(buf);
      });
      term.on('data', data => {
        socket.emit('data', data);
      });
      socket
        .on('input', input => {
          term.write(input);
          buf = /\177/.exec(input) ? buf.slice(0, -1) : buf + input;
        })
        .on('disconnect', () => {
          term.end();
          term.destroy();
          reject();
        });
    });
  }
}
