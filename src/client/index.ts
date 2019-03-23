import { Terminal } from 'xterm';
import { isUndefined } from 'lodash';
import * as io from 'socket.io-client';
import { fit } from 'xterm/lib/addons/fit/fit';
import './wetty.scss';
import './favicon.ico';

const userRegex = new RegExp('ssh/[^/]+$');
const trim = (str: string): string => str.replace(/\/*$/, '');
const socketBase = trim(window.location.pathname).replace(userRegex, '');
const socket = io(window.location.origin, {
  path: `${trim(socketBase)}/socket.io`,
});

socket.on('connect', () => {
  const term = new Terminal();
  term.open(document.getElementById('terminal'));
  const defaultOptions = { fontSize: 14 };
  let options: any;
  try {
    if (localStorage.options === undefined) {
      options = defaultOptions;
    } else {
      options = JSON.parse(localStorage.options);
    }
  } catch {
    options = defaultOptions;
  }
  Object.keys(options).forEach(key => {
    const value = options[key];
    term.setOption(key, value);
  });
  const code = JSON.stringify(options, null, 2);
  const editor = document.querySelector('#options .editor');
  editor.value = code;
  editor.addEventListener('keyup', e => {
    try {
      const updated = JSON.parse(editor.value);
      const updatedCode = JSON.stringify(updated, null, 2);
      editor.value = updatedCode;
      editor.classList.remove('error');
      localStorage.options = updatedCode;
      Object.keys(updated).forEach(key => {
        const value = updated[key];
        term.setOption(key, value);
      });
      resize();
    } catch {
      // skip
      editor.classList.add('error');
    }
  });
  document.getElementById('overlay').style.display = 'none';
  document.querySelector('#options .toggler').addEventListener('click', e => {
    document.getElementById('options').classList.toggle('opened');
    e.preventDefault();
  });
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

  function resize(): void {
    fit(term);
    socket.emit('resize', { cols: term.cols, rows: term.rows });
  }
  window.onresize = resize;
  resize();
  term.focus();

  function kill(data: string): void {
    disconnect(data);
  }

  term.on('data', data => {
    socket.emit('input', data);
  });
  term.on('resize', size => {
    socket.emit('resize', size);
  });
  socket
    .on('data', (data: string) => {
      term.write(data);
    })
    .on('login', () => {
      term.writeln('');
      resize();
    })
    .on('logout', kill)
    .on('disconnect', kill)
    .on('error', (err: string | null) => {
      if (err) disconnect(err);
    });
});

function disconnect(reason: string): void {
  document.getElementById('overlay').style.display = 'block';
  if (!isUndefined(reason)) document.getElementById('msg').innerHTML = reason;
  window.removeEventListener('beforeunload', handler, false);
}

function handler(e: { returnValue: string }): string {
  e.returnValue = 'Are you sure?';
  return e.returnValue;
}
