import _ from 'lodash';
import { dom, library } from '@fortawesome/fontawesome-svg-core';
import { faCogs } from '@fortawesome/free-solid-svg-icons';

import { FileDownloader } from './wetty/download.js';
import { disconnect } from './wetty/disconnect.js';
import { mobileKeyboard } from './wetty/mobile.js';
import { overlay } from './shared/elements.js';
import { socket } from './wetty/socket.js';
import { verifyPrompt } from './shared/verify.js';
import { terminal, Term } from './wetty/term.js';

// Setup for fontawesome
library.add(faCogs);
dom.watch();

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
      //FIXME: FileDownloader needs a backpressure shim as well
      const remainingData = fileDownloader.buffer(data);
      if (remainingData) {
        if (fcClient.needsCommit(data.length)) {
          term.write(remainingData, () => socket.emit('commit', fcClient.ackBytes));
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
    .on('disconnect', disconnect)
    .on('error', (err: string | null) => {
      if (err) disconnect(err);
    });
});

/**
 * Flow control client side.
 * For low impact on overall throughput simply commits every `ackBytes`
 * (default 2^19). The value should correspond to chosen values on server side
 * to avoid perma blocking.
 */
class FlowControlClient {
  public counter = 0;
  constructor(public ackBytes: number = 524288) {}
  public needsCommit(length: number): boolean {
    this.counter += length;
    if (this.counter >= this.ackBytes) {
      this.counter -= this.ackBytes;
      return true;
    }
    return false;
  }
}
