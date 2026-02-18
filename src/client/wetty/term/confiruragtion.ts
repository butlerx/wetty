import { editor } from '../disconnect/elements';
import { copySelected, copyShortcut } from './confiruragtion/clipboard';
import { onInput } from './confiruragtion/editor';
import { loadOptions } from './load';
import type { Options } from './options';
import type { Term } from '../term';

export function modifierHandler(e: KeyboardEvent): boolean {
  // We only care about keydown events with modifiers
  if (e.type !== 'keydown') return true;

  const modifiers =
    (e.shiftKey ? 1 : 0) |
    (e.altKey ? 2 : 0) |
    (e.ctrlKey ? 4 : 0) |
    (e.metaKey ? 8 : 0);

  // If no modifiers, let xterm handle it normally
  if (modifiers === 0) return true;

  // Key codes for special keys we want to support generically
  const specialKeys: Record<string, number> = {
    Enter: 13,
    Tab: 9,
    Backspace: 127,
    Escape: 27,
  };

  if (specialKeys[e.key]) {
    const code = specialKeys[e.key];
    const mod = modifiers + 1; // CSI u uses 1-based modifier mapping
    // Send the CSI u sequence: ESC [ code ; mod u
    window.wetty_term?.input(`\x1b[${code};${mod}u`, false);
    return false; // Intercepted
  }

  return true;
}

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

  term.attachCustomKeyEventHandler(e => {
    return copyShortcut(e) && modifierHandler(e);
  });

  document.addEventListener(
    'mouseup',
    () => {
      if (term.hasSelection()) copySelected(term.getSelection());
    },
    false,
  );

  toggle.addEventListener('click', e => {
    editor?.contentWindow?.loadOptions(loadOptions());
    optionsElem.classList.toggle('opened');
    e.preventDefault();
  });
}
