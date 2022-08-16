import type { Socket } from 'socket.io-client';
import _ from 'lodash';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

import type { Options } from './term/options';
import type { Json } from './term/options/types';
import { loadOptions } from './term/load';
import { configureTerm } from './term/confiruragtion';
import { terminal as termElement } from './disconnect/elements';

export class Term extends Terminal {
  socket: Socket;
  fitAddon: FitAddon;
  loadOptions: () => Options;

  constructor(socket: Socket) {
    super();
    this.socket = socket;
    this.fitAddon = new FitAddon();
    this.loadAddon(this.fitAddon);
    this.loadAddon(new WebLinksAddon());
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
    wettyTerm?: Term;
    wettyCloseConfig?: () => void;
    clipboardData: DataTransfer;
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
  window.wettyTerm = term;
  return term;
}
