import _ from 'lodash';
import { dom, library } from '@fortawesome/fontawesome-svg-core';
import { faCogs } from '@fortawesome/free-solid-svg-icons';

import { FileDownloader } from './wetty/download.js';
import { disconnect } from './wetty/disconnect.js';
import { mobileKeyboard } from './wetty/mobile.js';
import { overlay } from './shared/elements.js';
import { socket } from './wetty/socket.js';
import { verifyPrompt } from './shared/verify.js';
import { terminal } from './wetty/term.js';

// Setup for fontawesome
library.add(faCogs);
dom.watch();

socket.on('connect', () => {
  const term = terminal(socket);
  if (_.isUndefined(term)) return;

  if (!_.isNull(overlay)) overlay.style.display = 'none';
  window.addEventListener('beforeunload', verifyPrompt, false);
  window.addEventListener('resize', term.resizeTerm, false);

  term.resizeTerm();
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
      term.resizeTerm();
    })
    .on('logout', disconnect)
    .on('disconnect', disconnect)
    .on('error', (err: string | null) => {
      if (err) disconnect(err);
    });
});
