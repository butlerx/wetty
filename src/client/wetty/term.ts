import type { Socket } from 'socket.io-client';
import _ from 'lodash';
import { FitAddon } from 'xterm-addon-fit';
import { Terminal } from 'xterm';

import type { Term } from './shared/type';
import { configureTerm } from './term/confiruragtion.js';
import { terminal as termElement } from '../shared/elements.js';

export function terminal(socket: typeof Socket): Term | undefined {
  const term = new Terminal() as Term;
  if (_.isNull(termElement)) return;
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(termElement);
  term.resizeTerm = () => {
    fitAddon.fit();
    socket.emit('resize', { cols: term.cols, rows: term.rows });
  };
  configureTerm(term);
  window.onresize = term.resizeTerm;

  return term;
}
