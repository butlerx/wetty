import { FitAddon } from '@xterm/addon-fit';
import { ImageAddon } from '@xterm/addon-image';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';

import { terminal as termElement } from './disconnect/elements';
import { configureTerm } from './term/configuration';
import { registerKeyboardHandlers } from './term/keyboard';
import { loadOptions } from './term/load';
import { setTitle } from './title';
import type { Options } from './term/options';
import type { Socket } from 'socket.io-client';

const isMobile =
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  );

export class Term extends Terminal {
  socket: Socket;
  fitAddon: FitAddon;
  loadOptions: () => Options;

  constructor(socket: Socket) {
    super({ allowProposedApi: true });
    this.socket = socket;
    this.fitAddon = new FitAddon();
    this.loadAddon(this.fitAddon);
    this.loadAddon(new WebLinksAddon());
    this.loadAddon(new ImageAddon());
    this.loadOptions = loadOptions;
    if (!isMobile) {
      try {
        this.loadAddon(new WebglAddon());
      } catch {
        // WebGL not available — DOM renderer will be used
      }
    }
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
}

export function terminal(socket: Socket): Term | undefined {
  const term = new Term(socket);
  if (termElement === null) return undefined;
  termElement.innerHTML = '';
  term.open(termElement);
  configureTerm(term);
  window.onresize = function onResize() {
    term.resizeTerm();
  };
  window.wetty_term = term;
  registerKeyboardHandlers();
  return term;
}
