import { FitAddon } from '@xterm/addon-fit';
import { ImageAddon } from '@xterm/addon-image';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';

import { terminal as termElement } from '../disconnect/elements';
import { Notifier } from '../notifications';
import { setTitle } from '../title';
import { configureTerm } from './configuration';
import { createTerminalControls } from './controls';
import { loadOptions } from './load';
import type { Options } from './options';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../../protocol/socket-events.js';
import type { Socket } from 'socket.io-client';

const isMobile =
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  );
const isWindows = /Windows/i.test(navigator.userAgent);
const controls = createTerminalControls();
controls.install();

export class Term extends Terminal {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  fitAddon: FitAddon;
  loadOptions: () => Options;
  private configurationDisposer?: () => void;
  private sessionDisposed = false;

  constructor(
    socket: Socket<ServerToClientEvents, ClientToServerEvents>,
    notifier: Notifier,
  ) {
    super({ allowProposedApi: true });
    this.socket = socket;
    this.fitAddon = new FitAddon();
    this.loadAddon(this.fitAddon);
    this.loadAddon(new WebLinksAddon());
    this.loadAddon(new ImageAddon());
    this.loadOptions = loadOptions;
    // Use xterm's DOM renderer on Windows to avoid mis-scaled TUI rendering.
    if (!isMobile && !isWindows) {
      try {
        this.loadAddon(new WebglAddon());
      } catch {
        // WebGL not available — DOM renderer will be used
      }
    }
    this.parser.registerOscHandler(9, (data) => notifier.osc9(data));
    this.parser.registerOscHandler(777, (data) => notifier.osc777(data));
    this.onTitleChange(setTitle);
  }

  resizeTerm(): void {
    this.refresh(0, this.rows - 1);
    if (this.shouldFitTerm) this.fitAddon.fit();
    this.socket.emit('resize', { cols: this.cols, rows: this.rows });
  }

  get shouldFitTerm(): boolean {
    return this.loadOptions().wettyFitTerminal;
  }

  setConfigurationDisposer(disposer: () => void): void {
    this.configurationDisposer = disposer;
  }

  override dispose(): void {
    if (this.sessionDisposed) return;
    this.sessionDisposed = true;
    const disposeConfiguration = this.configurationDisposer;
    this.configurationDisposer = undefined;
    try {
      disposeConfiguration?.();
    } finally {
      try {
        controls.reset();
      } finally {
        super.dispose();
      }
    }
  }
}

export function terminal(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  notifier: Notifier,
): Term | undefined {
  const term = new Term(socket, notifier);
  if (termElement === null) {
    term.dispose();
    return undefined;
  }
  try {
    termElement.innerHTML = '';
    term.open(termElement);
    term.setConfigurationDisposer(configureTerm(term));
    Notifier.requestPermissionOnClick(termElement);
    return term;
  } catch (error) {
    term.dispose();
    throw error;
  }
}
