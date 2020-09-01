import _ from '/../web_modules/lodash.js';
import type { Socket } from 'socket.io-client';
import { FitAddon } from '/../web_modules/xterm-addon-fit.js';
import { Terminal } from '/../web_modules/xterm.js';

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
