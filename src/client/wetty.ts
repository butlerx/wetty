import _ from 'lodash';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { dom, library } from '@fortawesome/fontawesome-svg-core';
import { faCogs } from '@fortawesome/free-solid-svg-icons';

import { FileDownloader } from './wetty/download.js';
import { copySelected, copyShortcut } from './wetty/clipboard.js';
import { disconnect } from './wetty/disconnect.js';
import { configureTerm } from './wetty/options.js';
import { mobileKeyboard } from './wetty/mobile.js';
import { overlay, terminal } from './shared/elements.js';
import { socket } from './wetty/socket.js';
import { verifyPrompt } from './shared/verify.js';

// Setup for fontawesome
library.add(faCogs);
dom.watch();

socket.on('connect', () => {
  const term = new Terminal();
  if (_.isNull(terminal)) return;
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminal);
  const resize = (): void => {
    fitAddon.fit();
    socket.emit('resize', { cols: term.cols, rows: term.rows });
  };

  configureTerm(term, resize);

  if (!_.isNull(overlay)) overlay.style.display = 'none';
  window.addEventListener('beforeunload', verifyPrompt, false);

  term.attachCustomKeyEventHandler(copyShortcut);

  document.addEventListener(
    'mouseup',
    event => {
      if (term.hasSelection()) copySelected(event, term.getSelection());
    },
    false,
  );

  window.onresize = resize;
  resize();
  term.focus();
  mobileKeyboard();
  const fileDownloader = new FileDownloader();

  term.onData((data: string) => {
    socket.emit('input', data);
  });
  term.onResize((size: { cols: number; rows: number }) => {
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
      resize();
    })
    .on('logout', disconnect)
    .on('disconnect', disconnect)
    .on('error', (err: string | null) => {
      if (err) disconnect(err);
    });
});
