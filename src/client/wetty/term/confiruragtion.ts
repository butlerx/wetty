import _ from 'lodash';

import type { Term } from '../shared/type';
import { copySelected, copyShortcut } from './confiruragtion/clipboard';
import { onInput } from './confiruragtion/editor';
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
    editor.addEventListener('keyup', onInput(term));
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
