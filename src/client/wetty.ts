import { dom, library } from '@fortawesome/fontawesome-svg-core';
import { faCogs, faKeyboard } from '@fortawesome/free-solid-svg-icons';

import '../assets/scss/styles.scss';

import { disconnect } from './wetty/disconnect';
import { overlay } from './wetty/disconnect/elements';
import { verifyPrompt } from './wetty/disconnect/verify';
import { FileDownloader } from './wetty/download';
import { FlowControlClient } from './wetty/flowcontrol';
import { socket } from './wetty/socket';
import { terminal, Term } from './wetty/term';

if ('serviceWorker' in navigator) {
  const scripts = Array.from(document.getElementsByTagName('script'));
  const own = scripts.find((s) => s.src.endsWith('/wetty.js'));
  if (own) {
    const base = own.src.replace(/\/client\/wetty\.js$/, '');
    void navigator.serviceWorker.register(`${base}/sw.js`, {
      scope: `${base}/`,
    });
  }
}

// Setup for fontawesome
library.add(faCogs);
library.add(faKeyboard);
dom.watch();

function onResize(term: Term): () => void {
  return function resize() {
    term.resizeTerm();
  };
}

socket.on('connect', () => {
  // The engine loads asynchronously (wasm). Handlers register
  // synchronously and queue their work until the terminal is ready, so
  // a fast first burst (or an instant logout) is never dropped.
  let queue: (() => void)[] | null = [];
  const whenReady = (action: () => void): void => {
    if (queue === null) {
      action();
    } else {
      queue.push(action);
    }
  };

  const fileDownloader = new FileDownloader();
  const fcClient = new FlowControlClient();
  let activeTerm: Term;

  socket
    .on('data', (data: string) => {
      whenReady(() => {
        const remainingData = fileDownloader.buffer(data);
        const downloadLength = data.length - remainingData.length;
        if (downloadLength && fcClient.needsCommit(downloadLength)) {
          socket.emit('commit', fcClient.ackBytes);
        }
        if (remainingData) {
          if (fcClient.needsCommit(remainingData.length)) {
            activeTerm.write(remainingData, () =>
              socket.emit('commit', fcClient.ackBytes),
            );
          } else {
            activeTerm.write(remainingData);
          }
        }
      });
    })
    .on('login', () => {
      whenReady(() => {
        activeTerm.writeln('');
        activeTerm.resizeTerm();
      });
    })
    .on('logout', () => {
      whenReady(() => {
        disconnect();
      });
    })
    .on('disconnect', () => {
      whenReady(() => {
        disconnect();
      });
    })
    .on('error', (err: string | null) => {
      whenReady(() => {
        if (err) disconnect(err);
      });
    });

  void (async () => {
    const term = await terminal(socket);
    if (term === undefined) return;
    activeTerm = term;

    if (overlay !== null) overlay.style.display = 'none';
    window.addEventListener('beforeunload', verifyPrompt, false);
    window.addEventListener('resize', onResize(term), false);

    term.resizeTerm();
    term.focus();

    term.onData((data: string) => {
      socket.emit('input', data);
    });
    term.onResize((size: { cols: number; rows: number }) => {
      socket.emit('resize', size);
    });

    const backlog = queue;
    queue = null;
    backlog.forEach((action) => {
      action();
    });
  })();
});
