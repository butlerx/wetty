import { Terminal } from 'xterm';
import { isNull } from 'lodash';

import { dom, library } from "@fortawesome/fontawesome-svg-core";
import { faCogs } from "@fortawesome/free-solid-svg-icons/faCogs";
import { socket } from './socket';
import { overlay, terminal } from './elements';
import { FILE_BEGIN, FILE_END, fileBuffer, onCompleteFile } from './download';
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

  term.on('data', data => {
    socket.emit('input', data);
  });
  term.on('resize', size => {
    socket.emit('resize', size);
  });
  socket
    .on('data', (data: string) => {
      const indexOfFileBegin = data.indexOf(FILE_BEGIN);
      const indexOfFileEnd = data.indexOf(FILE_END);

      // If we've got the entire file in one chunk
      if (indexOfFileBegin !== -1 && indexOfFileEnd !== -1) {
        fileBuffer.push(data);
        onCompleteFile();
      }
      // If we've found a beginning marker
      else if (indexOfFileBegin !== -1) {
        fileBuffer.push(data);
      }
      // If we've found an ending marker
      else if (indexOfFileEnd !== -1) {
        fileBuffer.push(data);
        onCompleteFile();
      }
      // If we've found the continuation of a file
      else if (fileBuffer.length > 0) {
        fileBuffer.push(data);
      }
      // Just treat it as normal data
      else {
        term.write(data);
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
