import { editor } from '../disconnect/elements';
import { copySelected, copyShortcut } from './confiruragtion/clipboard';
import { onInput } from './confiruragtion/editor';
import { loadOptions } from './load';
import type { Options } from './options';
import type { Term } from '../term';

export function configureTerm(term: Term): void {
  const options = loadOptions();
  try {
    term.options = options.xterm;
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
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    editor.contentWindow!.wetty_close_config = () => {
      optionsElem?.classList.toggle('opened');
    };
    editor.contentWindow!.wetty_save_config = (newConfig: Options) => {
      onInput(term, newConfig);
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
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
