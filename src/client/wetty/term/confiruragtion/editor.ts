import type { Term } from '../../term';
import { editor } from '../../../shared/elements';
import type { Options } from './shared/options';

export const onInput = (term: Term, updated: Options) => {
  try {
    const updatedConf = JSON.stringify(updated, null, 2);
    if (localStorage.options === updatedConf) return;
    setOptions(term, updated);
    if (
      !updated.wettyFitTerminal &&
      updated.xterm.cols != null &&
      updated.xterm.rows != null
    )
      term.resize(updated.xterm.cols, updated.xterm.rows);
    term.resizeTerm();
    editor.classList.remove('error');
    localStorage.options = updatedConf;
  } catch (e) {
    console.error('Configuration Error', e);
    editor.classList.add('error');
  }
};

export function setOptions(term: Term, { xterm }: Options) {
  Object.keys(xterm).forEach(key => {
    if (key === 'cols' || key === 'rows') return;
    const value = xterm[key];
    term.setOption(key, value);
  });
}
