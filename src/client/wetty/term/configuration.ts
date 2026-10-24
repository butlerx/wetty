import { editor } from '../disconnect/elements';
import { copySelected, copyShortcut } from './configuration/clipboard';
import { onInput } from './configuration/editor';
import { loadOptions } from './load';
import type { Options } from './options';
import type { Term } from '../term';

export function configureTerm(term: Term): () => void {
  const options = loadOptions();
  try {
    term.options = options.xterm;
  } catch {
    /* Do nothing */
  }

  const foundToggle = document.querySelector('#options .toggler');
  const foundOptions = document.getElementById('options');
  if (editor == null || foundToggle == null || foundOptions == null) {
    throw new Error("Couldn't initialize configuration menu");
  }

  const editorElem = editor;
  const toggle: Element = foundToggle;
  const optionsElem: HTMLElement = foundOptions;
  const applicationOrigin = window.location.origin;
  let active = true;

  function sendOptionsToEditor(): void {
    if (!active) return;
    editorElem.contentWindow?.postMessage(
      { type: 'wetty:load', config: loadOptions() },
      applicationOrigin,
    );
  }

  function editorOnLoad(): void {
    sendOptionsToEditor();
  }

  interface WettySaveMessage {
    type: 'wetty:save';
    config: Options;
  }

  interface WettyCloseMessage {
    type: 'wetty:close';
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function isOptions(value: unknown): value is Options {
    if (!isRecord(value) || !isRecord(value.xterm)) return false;
    return (
      typeof value.wettyFitTerminal === 'boolean' &&
      typeof value.wettyVoid === 'number' &&
      Number.isFinite(value.wettyVoid)
    );
  }

  function decodeEditorMessage(
    value: unknown,
  ): WettySaveMessage | WettyCloseMessage | null {
    if (!isRecord(value) || typeof value.type !== 'string') return null;
    if (value.type === 'wetty:close') return { type: 'wetty:close' };
    if (value.type === 'wetty:save' && isOptions(value.config)) {
      return { type: 'wetty:save', config: value.config };
    }
    return null;
  }

  function editorOnMessage(event: MessageEvent<unknown>): void {
    if (
      !active ||
      event.origin !== applicationOrigin ||
      event.source !== editorElem.contentWindow
    ) {
      return;
    }
    const message = decodeEditorMessage(event.data);
    if (message?.type === 'wetty:save') {
      onInput(term, message.config);
    } else if (message?.type === 'wetty:close') {
      optionsElem.classList.toggle('opened');
    }
  }

  function toggleOnClick(event: Event): void {
    if (!active) return;
    sendOptionsToEditor();
    optionsElem.classList.toggle('opened');
    if (optionsElem.classList.contains('opened')) {
      document
        .querySelector('div#functions > div.onscreen-buttons')
        ?.classList.remove('active');
    }
    event.preventDefault();
  }

  function copyOnMouseUp(): void {
    if (active && term.hasSelection()) copySelected(term.getSelection());
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
  term.attachCustomKeyEventHandler(copyShortcut);
  editorElem.addEventListener('load', editorOnLoad);
  window.addEventListener('message', editorOnMessage);
  toggle.addEventListener('click', toggleOnClick);
  document.addEventListener('mouseup', copyOnMouseUp, false);

  return function disposeConfiguration(): void {
    if (!active) return;
    active = false;
    editorElem.removeEventListener('load', editorOnLoad);
    window.removeEventListener('message', editorOnMessage);
    toggle.removeEventListener('click', toggleOnClick);
    document.removeEventListener('mouseup', copyOnMouseUp, false);
  };
}
