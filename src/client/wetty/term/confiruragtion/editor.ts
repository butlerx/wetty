import JSON5 from 'json5';

import type { Term } from '../../shared/type';
import { editor } from '../../../shared/elements';

export const onInput = (term: Term) => (): void => {
  try {
    const updated = JSON5.parse(editor.value);
    const updatedConf = JSON.stringify(updated, null, 2);
    if (localStorage.options === updatedConf) return;
    Object.keys(updated).forEach(key => {
      const value = updated[key];
      term.setOption(key, value);
    });
    term.resizeTerm();
    editor.value = updatedConf;
    editor.classList.remove('error');
    localStorage.options = updatedConf;
  } catch {
    // skip
    editor.classList.add('error');
  }
};
