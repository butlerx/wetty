import { editor } from '../disconnect/elements';
import { onInput } from './configuration/editor';
import { loadOptions } from './load';
import type { Options } from './options';
import type { Term } from '../term';

export function configureTerm(term: Term): void {
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
      void onInput(term, data.config);
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

  // Copy-on-select and ctrl+shift+c are built into the engine's input
  // handling, so no custom key handler or mouseup listener is needed.
}
