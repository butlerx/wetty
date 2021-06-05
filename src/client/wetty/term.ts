import type { Socket } from 'socket.io-client';
import _ from 'lodash';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { FitAddon } from 'xterm-addon-fit';
import { Terminal } from 'xterm';

import type { Term } from './shared/type';
import { configureTerm, shouldFitTerm } from './term/confiruragtion.js';
import { terminal as termElement } from '../shared/elements.js';

export function terminal(socket: typeof Socket): Term | undefined {
  const term = new Terminal() as Term;
  if (_.isNull(termElement)) return undefined;
  const webLinksAddon = new WebLinksAddon();
  term.loadAddon(webLinksAddon);
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(termElement);
  term.resizeTerm = () => {
    term.refresh(0, term.rows - 1);
    if (shouldFitTerm()) fitAddon.fit();
    socket.emit('resize', { cols: term.cols, rows: term.rows });
  };
  configureTerm(term);
  window.onresize = term.resizeTerm;
  (window as any).wetty_term = term;

  return term;
}
