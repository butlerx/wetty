import type { Term } from '../term';
import { copySelected, copyShortcut } from './confiruragtion/clipboard';
import { onInput, setOptions } from './load/editor';
import { editor } from '../disconnect/elements';
import { loadOptions, loadLocalStorage } from './load';

export function configureTerm(term: Term): void {
  const options = loadLocalStorage();
  try {
    setOptions(term, options);
  } catch {
    /* Do nothing */
  }

  const toggle = document.querySelector('#options .toggler');
  const optionsElem = document.getElementById('options');
  if (editor == null || toggle == null || optionsElem == null) {
    throw new Error("Couldn't initialize configuration menu");
  }

  if (
    (
      editor.contentDocument ||
      (editor.contentWindow?.document ?? {
        readyState: '',
      })
    ).readyState === 'complete'
  ) {
    loadOptions();
  }
  editor.addEventListener('load', loadOptions);

  toggle.addEventListener('click', e => {
    loadOptions();
    optionsElem.classList.toggle('opened');
    e.preventDefault();
  });

  term.attachCustomKeyEventHandler(copyShortcut);

  document.addEventListener(
    'mouseup',
    () => {
      if (term.hasSelection()) copySelected(term.getSelection());
    },
    false,
  );
}
