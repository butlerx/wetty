import _ from 'lodash';
import type { Terminal } from 'xterm';

import { editor } from '../shared/elements.js';

function loadOptions(): object {
  const defaultOptions = { fontSize: 14 };
  try {
    return _.isUndefined(localStorage.options)
      ? defaultOptions
      : JSON.parse(localStorage.options);
  } catch {
    return defaultOptions;
  }
}

export function configureTerm(term: Terminal, resize: Function): void {
  const options = loadOptions();
  Object.entries(options).forEach(([key, value]) => {
    term.setOption(key, value);
  });
  const config = JSON.stringify(options, null, 2);
  if (!_.isNull(editor)) {
    editor.value = config;
    editor.addEventListener('keyup', () => {
      try {
        const updated = JSON.parse(editor.value);
        const updatedConf = JSON.stringify(updated, null, 2);
        editor.value = updatedConf;
        editor.classList.remove('error');
        localStorage.options = updatedConf;
        Object.keys(updated).forEach(key => {
          const value = updated[key];
          term.setOption(key, value);
        });
        resize();
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
}
