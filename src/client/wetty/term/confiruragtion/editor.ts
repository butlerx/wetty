import { editor } from '../../disconnect/elements';
import type { Term } from '../../term';
import type { Options } from '../options';

export const onInput = (term: Term, updated: Options) => {
  try {
    const updatedConf = JSON.stringify(updated, null, 2);
    if (localStorage.options === updatedConf) return;
    term.options = updated.xterm;
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
    console.error('Configuration Error', e); // eslint-disable-line no-console
    editor.classList.add('error');
  }
};
