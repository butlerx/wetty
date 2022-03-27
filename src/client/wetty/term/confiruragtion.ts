import type { Term } from '../term';
import type { Options } from './confiruragtion/shared/options';
import { copySelected, copyShortcut } from './confiruragtion/clipboard';
import { onInput, setOptions } from './confiruragtion/editor';
import { editor } from '../../shared/elements';
import { loadOptions } from './confiruragtion/load';

export function configureTerm(term: Term): void {
  const options = loadOptions();
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

  function editorOnLoad() {
    editor?.contentWindow?.loadOptions(loadOptions());
    editor.contentWindow!.wetty_close_config = () => {
      optionsElem?.classList.toggle('opened');
    };
    editor.contentWindow!.wetty_save_config = (newConfig: Options) => {
      onInput(term, newConfig);
    };
  }
  if (
    (
      editor.contentDocument ||
      (editor.contentWindow?.document ?? {
        readyState: '',
      })
    ).readyState === 'complete'
  ) {
    editorOnLoad();
  }
  editor.addEventListener('load', editorOnLoad);

  toggle.addEventListener('click', e => {
    editor?.contentWindow?.loadOptions(loadOptions());
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

export function shouldFitTerm(): boolean {
  return loadOptions().wettyFitTerminal ?? true;
}
