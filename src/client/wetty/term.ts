import type { Socket } from 'socket.io-client';
import _ from 'lodash';

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { configureTerm, shouldFitTerm } from './term/confiruragtion.js';
import { terminal as termElement } from '../shared/elements.js';

export class Term extends Terminal {
  socket: typeof Socket;
  fitAddon: FitAddon;
  constructor(socket: typeof Socket) {
    super();
    this.socket = socket;
    this.fitAddon = new FitAddon();
    this.loadAddon(this.fitAddon);
    this.loadAddon(new WebLinksAddon());
  }

  resizeTerm(): void {
    this.refresh(0, this.rows - 1);
    if (shouldFitTerm()) this.fitAddon.fit();
    this.socket.emit('resize', { cols: this.cols, rows: this.rows });
  }
}

export function terminal(socket: typeof Socket): Term | undefined {
  const term = new Term(socket) as Term;
  if (_.isNull(termElement)) return undefined;
  termElement.innerHTML = '';
  term.open(termElement);
  configureTerm(term);
  window.onresize = term.resizeTerm;
  (window as any).wetty_term = term;
  return term;
}
