import { Terminal } from 'xterm';
import { isUndefined } from 'lodash';
import io from 'socket.io-client';
import * as fit from './fit';
import './wetty.scss';

Terminal.applyAddon(fit);
const socket = io(window.location.origin, { path: '/wetty/socket.io' });

socket.on('connect', () => {
  const term = new Terminal();
  term.open(document.getElementById('terminal'), { focus: true });
  term.setOption('fontSize', 14);
  document.getElementById('overlay').style.display = 'none';
  window.addEventListener('beforeunload', handler, false);
  /*
    term.scrollPort_.screen_.setAttribute('contenteditable', 'false');
  */

  term.attachCustomKeyEventHandler(e => {
    // Ctrl + Shift + C
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      document.execCommand('copy');
      return false;
    }
    return true;
  });

  function resize() {
    term.fit();
    socket.emit('resize', { cols: term.cols, rows: term.rows });
  }
  window.onresize = resize;
  resize();
  term.focus();

  function kill(data) {
    disconnect(data);
  }

  term.on('data', data => {
    socket.emit('input', data);
  });
  term.on('resize', size => {
    socket.emit('resize', size);
  });
  socket
    .on('data', data => {
      term.write(data);
    })
    .on('login', () => {
      term.writeln('');
      resize();
    })
    .on('logout', kill)
    .on('disconnect', kill)
    .on('error', err => {
      if (err) disconnect(err);
    });
});

function disconnect(reason) {
  document.getElementById('overlay').style.display = 'block';
  if (!isUndefined(reason)) document.getElementById('msg').innerHTML = reason;
  window.removeEventListener('beforeunload', handler, false);
}

function handler(e) {
  e.returnValue = 'Are you sure?';
  return e.returnValue;
}
