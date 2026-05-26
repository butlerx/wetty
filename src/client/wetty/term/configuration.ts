import { editor } from '../disconnect/elements';
import { copySelected, copyShortcut } from './configuration/clipboard';
import { onInput } from './configuration/editor';
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

  const editorElem = editor;

  function sendOptionsToEditor() {
    editorElem.contentWindow?.postMessage(
      { type: 'wetty:load', config: loadOptions() },
      '*',
    );
  }

  function editorOnLoad() {
    sendOptionsToEditor();
  }
  if (
    (
      editorElem.contentDocument ??
      editorElem.contentWindow?.document ?? {
        readyState: '',
      }
    ).readyState === 'complete'
  ) {
    editorOnLoad();
  }
  editorElem.addEventListener('load', editorOnLoad);

  interface WettyMessage {
    type: string;
    config?: Options;
  }

  window.addEventListener('message', (e: MessageEvent<unknown>) => {
    const data = e.data as WettyMessage | null;
    if (data?.type === 'wetty:save' && data.config !== undefined) {
      onInput(term, data.config);
    } else if (data?.type === 'wetty:close') {
      optionsElem.classList.toggle('opened');
    }
  });

  toggle.addEventListener('click', (e) => {
    sendOptionsToEditor();
    optionsElem.classList.toggle('opened');
    if (optionsElem.classList.contains('opened')) {
      document
        .querySelector('div#functions > div.onscreen-buttons')
        ?.classList.remove('active');
    }
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
