import type { Socket } from 'socket.io-client';
import _ from 'lodash';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { ImageAddon } from 'xterm-addon-image';

import type { Options } from './term/options';
import { loadOptions } from './term/load';
import { configureTerm } from './term/confiruragtion';
import { terminal as termElement } from './disconnect/elements';

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
    // Note: worker file is currently hard copied from xterm-addon-image,
    // the file needs to be refreshed upon a newer package version
    this.loadAddon(new ImageAddon('/wetty/assets/xterm-addon-image-worker.js'));
    this.loadOptions = loadOptions;
  }

  resizeTerm(): void {
    this.refresh(0, this.rows - 1);
    if (this.shouldFitTerm) this.fitAddon.fit();
    this.socket.emit('resize', { cols: this.cols, rows: this.rows });
  }

  get shouldFitTerm(): boolean {
    return this.loadOptions().wettyFitTerminal ?? true;
  }
}

declare global {
  interface Window {
    wetty_term?: Term;
    wetty_close_config?: () => void;
    wetty_save_config?: (newConfig: Options) => void;
    clipboardData: DataTransfer;
    loadOptions: (conf: Options) => void;
  }
}

export function terminal(socket: Socket): Term | undefined {
  const term = new Term(socket);
  if (_.isNull(termElement)) return undefined;
  termElement.innerHTML = '';
  term.open(termElement);
  configureTerm(term);
  window.onresize = function onResize() {
    term.resizeTerm();
  };
  window.wetty_term = term;
  return term;
}
