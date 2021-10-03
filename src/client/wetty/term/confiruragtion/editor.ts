import type { Term } from '../../term';
import { editor } from '../../../shared/elements';

export const onInput = (term: Term, updated: any) => {
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
    console.error('Configuration Error');
    console.error(e);
    editor.classList.add('error');
  }
};

export function setOptions(term: Term, options: any) {
  Object.keys(options.xterm).forEach(key => {
    if (key === 'cols' || key === 'rows') return;
    const value = options.xterm[key];
    term.setOption(key, value);
  });
}
