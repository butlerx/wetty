import { dom, library } from '@fortawesome/fontawesome-svg-core';
import { faCogs, faKeyboard } from '@fortawesome/free-solid-svg-icons';

import '../assets/scss/styles.scss';

import { disconnect } from './wetty/disconnect';
import { overlay } from './wetty/disconnect/elements';
import { verifyPrompt } from './wetty/disconnect/verify';
import { FileDownloader } from './wetty/download';
import { FlowControlClient } from './wetty/flowcontrol';
import { mobileKeyboard } from './wetty/mobile';
import { Notifier } from './wetty/notifications';
import './wetty/serviceWorker';
import { createSessionController } from './wetty/session';
import { socket } from './wetty/socket';
import { terminal, Term } from './wetty/term';

// Setup for fontawesome
library.add(faCogs);
library.add(faKeyboard);
dom.watch();

function beforeUnloadHandler(event: BeforeUnloadEvent): void {
  verifyPrompt(event);
}

// Shared across reconnects, so listeners and the AudioContext are not
// recreated for every new terminal.
const notifier = new Notifier();

createSessionController({
  socket,
  windowTarget: window,
  beforeUnloadHandler,
  createTerminal: () => terminal(socket, notifier),
  createFileDownloader: () => new FileDownloader(),
  createFlowControl: () => new FlowControlClient(),
  enableMobileKeyboard: mobileKeyboard,
  showConnected: () => {
    if (overlay !== null) overlay.style.display = 'none';
  },
  showDisconnected: disconnect,
  setTerminalReference: (term) => {
    window.wetty_term = term as Term;
  },
  clearTerminalReference: (term) => {
    if (window.wetty_term === term) window.wetty_term = undefined;
  },
});
