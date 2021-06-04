import type { Term } from '../../shared/type';
// import { editor } from '../../../shared/elements';

export const onInput = (term: Term, updated: any) => {
  try {
    const updatedConf = JSON.stringify(updated, null, 2);
    if (localStorage.options === updatedConf) return;
    Object.keys(updated).forEach(key => {
      const value = updated[key];
      term.setOption(key, value);
    });
    term.resizeTerm();
    // editor.classList.remove('error');
    localStorage.options = updatedConf;
  } catch (e) {
    console.error(e);
    // skip
    // editor.classList.add('error');
  }
};
