import { Terminal } from 'xterm';
import { fit } from 'xterm/lib/addons/fit/fit';
import { socket } from './socket';

export default function resize(term: Terminal): Function {
  return (): void => {
    fit(term);
    socket.emit('resize', { cols: term.cols, rows: term.rows });
  };
}
