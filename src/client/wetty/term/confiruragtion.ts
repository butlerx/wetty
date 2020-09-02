import _ from 'lodash';
import JSON5 from 'json5';

import type { Term } from '../shared/type';
import { copySelected, copyShortcut } from './confiruragtion/clipboard';
import { editor } from '../../shared/elements';
import { loadOptions } from './confiruragtion/load';

export function configureTerm(term: Term): void {
  const options = loadOptions();
  Object.entries(options).forEach(([key, value]) => {
    term.setOption(key, value);
  });
  const config = JSON.stringify(options, null, 2);
  if (!_.isNull(editor)) {
    editor.value = config;
    editor.addEventListener('keyup', () => {
      try {
        const updated = JSON5.parse(editor.value);
        const updatedConf = JSON.stringify(updated, null, 2);
        editor.value = updatedConf;
        editor.classList.remove('error');
        localStorage.options = updatedConf;
        Object.keys(updated).forEach(key => {
          const value = updated[key];
          term.setOption(key, value);
        });
        term.resizeTerm();
      } catch {
        // skip
        editor.classList.add('error');
      }
    });
    const toggle = document.querySelector('#options .toggler');
    const optionsElem = document.getElementById('options');
    if (!_.isNull(toggle) && !_.isNull(optionsElem)) {
      toggle.addEventListener('click', e => {
        optionsElem.classList.toggle('opened');
        e.preventDefault();
      });
    }
  }

  term.attachCustomKeyEventHandler(copyShortcut);

  document.addEventListener(
    'mouseup',
    () => {
      if (term.hasSelection()) copySelected(term.getSelection());
    },
    false,
  );
}
