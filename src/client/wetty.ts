import { dom, library } from '@fortawesome/fontawesome-svg-core';
import { faCogs, faKeyboard } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';

import '../assets/scss/styles.scss';

import { disconnect, showReconnecting, hideOverlay } from './wetty/disconnect';
import { overlay } from './wetty/disconnect/elements';
import { verifyPrompt } from './wetty/disconnect/verify';
import { FileDownloader } from './wetty/download';
import { FlowControlClient } from './wetty/flowcontrol';
import { mobileKeyboard } from './wetty/mobile';
import { socket } from './wetty/socket';
import { terminal, Term } from './wetty/term';
import { getTheme, resolveThemeName } from './wetty/term/themes';

// Setup for fontawesome
library.add(faCogs);
library.add(faKeyboard);
dom.watch();

// Apply theme background early to reduce flash of wrong color
(function applyEarlyBackground() {
  const themeName = resolveThemeName();
  if (themeName) {
    const theme = getTheme(themeName);
    if (theme) {
      document.body.style.backgroundColor = theme.background;
    }
  }
})();

function onResize(term: Term): () => void {
  return function resize() {
    term.resizeTerm();
  };
}

socket.on('connect', () => {
  const term = terminal(socket);
  if (_.isUndefined(term)) return;

  if (!_.isNull(overlay)) overlay.style.display = 'none';
  window.addEventListener('beforeunload', verifyPrompt, false);
  window.addEventListener('resize', onResize(term), false);

  term.resizeTerm();
  term.focus();
  mobileKeyboard();
  const fileDownloader = new FileDownloader();
  const fcClient = new FlowControlClient();

  term.onData((data: string) => {
    socket.emit('input', data);
  });
  term.onResize((size: { cols: number; rows: number }) => {
    socket.emit('resize', size);
  });
  socket
    .on('data', (data: string) => {
      const remainingData = fileDownloader.buffer(data);
      const downloadLength = data.length - remainingData.length;
      if (downloadLength && fcClient.needsCommit(downloadLength)) {
        socket.emit('commit', fcClient.ackBytes);
      }
      if (remainingData) {
        if (fcClient.needsCommit(remainingData.length)) {
          term.write(remainingData, () =>
            socket.emit('commit', fcClient.ackBytes),
          );
        } else {
          term.write(remainingData);
        }
      }
    })
    .on('login', () => {
      term.writeln('');
      term.resizeTerm();
    })
    .on('logout', disconnect)
    .on('disconnect', (reason: string) => {
      if (socket.active) {
        showReconnecting();
      } else {
        disconnect(reason);
      }
    })
    .on('error', (err: string | null) => {
      if (err) disconnect(err);
    });
});

socket.io.on('reconnect', () => {
  hideOverlay();
});

socket.io.on('reconnect_failed', () => {
  disconnect('Connection lost. Please reconnect.');
});
