import { Terminal } from 'xterm';
import { isNull } from 'lodash';

import { dom, library } from '@fortawesome/fontawesome-svg-core';
import { faCogs } from '@fortawesome/free-solid-svg-icons/faCogs';
import Toastify from 'toastify-js';
import * as fileType from 'file-type';
import { socket } from './socket';
import { overlay, terminal } from './elements';
import { FileDownloader } from './download';
import verifyPrompt from './verify';
import disconnect from './disconnect';
import mobileKeyboard from './mobile';
import resize from './resize';
import loadOptions from './options';
import { copySelected, copyShortcut } from './copyToClipboard';
import './wetty.scss';
import './favicon.ico';

// Setup for fontawesome
library.add(faCogs);
dom.watch();

socket.on('connect', () => {
  const term = new Terminal();
  if (isNull(terminal)) return;
  term.open(terminal);

  const options = loadOptions();
  Object.entries(options).forEach(([key, value]) => {
    term.setOption(key, value);
  });
  const code = JSON.stringify(options, null, 2);
  const editor = document.querySelector('#options .editor');
  if (!isNull(editor)) {
    editor.value = code;
    editor.addEventListener('keyup', () => {
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
        resize(term)();
      } catch {
        // skip
        editor.classList.add('error');
      }
    });
    const toggle = document.querySelector('#options .toggler');
    const optionsElem = document.getElementById('options');
    if (!isNull(toggle) && !isNull(optionsElem)) {
      toggle.addEventListener('click', e => {
        optionsElem.classList.toggle('opened');
        e.preventDefault();
      });
    }
  }
  if (!isNull(overlay)) overlay.style.display = 'none';
  window.addEventListener('beforeunload', verifyPrompt, false);

  term.attachCustomKeyEventHandler(copyShortcut);

  document.addEventListener(
    'mouseup',
    () => {
      if (term.hasSelection()) copySelected(term.getSelection());
    },
    false
  );

  window.onresize = resize(term);
  resize(term)();
  term.focus();
  mobileKeyboard();

  const fileDownloader = new FileDownloader((bufferCharacters: string) => {
    let fileCharacters = bufferCharacters;
    // Try to decode it as base64, if it fails we assume it's not base64
    try {
      fileCharacters = window.atob(fileCharacters);
    } catch (err) {
      // Assuming it's not base64...
    }

    const bytes = new Uint8Array(fileCharacters.length);
    for (let i = 0; i < fileCharacters.length; i += 1) {
      bytes[i] = fileCharacters.charCodeAt(i);
    }

    let mimeType = 'application/octet-stream';
    let fileExt = '';
    const typeData = fileType(bytes);
    if (typeData) {
      mimeType = typeData.mime;
      fileExt = typeData.ext;
    }
    const fileName = `file-${new Date()
      .toISOString()
      .split('.')[0]
      .replace(/-/g, '')
      .replace('T', '')
      .replace(/:/g, '')}${fileExt ? `.${fileExt}` : ''}`;

    const blob = new Blob([new Uint8Array(bytes.buffer)], {
      type: mimeType,
    });
    const blobUrl = URL.createObjectURL(blob);

    Toastify({
      text: `Download ready: <a href="${blobUrl}" target="_blank" download="${fileName}">${fileName}</a>`,
      duration: 10000,
      newWindow: true,
      gravity: 'bottom',
      position: 'right',
      backgroundColor: '#fff',
      stopOnFocus: true,
    }).showToast();
  });

  term.on('data', data => {
    socket.emit('input', data);
  });
  term.on('resize', size => {
    socket.emit('resize', size);
  });
  socket
    .on('data', (data: string) => {
      const remainingData = fileDownloader.buffer(data);
      if (remainingData) {
        term.write(remainingData);
      }
    })
    .on('login', () => {
      term.writeln('');
      resize(term)();
    })
    .on('logout', disconnect)
    .on('disconnect', disconnect)
    .on('error', (err: string | null) => {
      if (err) disconnect(err);
    });
});
