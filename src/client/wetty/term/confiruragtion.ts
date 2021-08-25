import _ from 'lodash';

import type { Term } from '../shared/type';
import { copySelected, copyShortcut } from './confiruragtion/clipboard';
import { onInput, setOptions } from './confiruragtion/editor';
import { editor } from '../../shared/elements';
import { loadOptions } from './confiruragtion/load';

export function configureTerm(term: Term): void {
  let options = loadOptions();
  // Convert old options to new options
  if (!("xterm" in options)) options = { xterm: options };
  try { setOptions(term, options); } catch { /* Do nothing */ };

  const toggle = document.querySelector('#options .toggler');
  const optionsElem = document.getElementById('options');
  if (editor == null || toggle == null || optionsElem == null) throw new Error("Couldn't initialize configuration menu");

  function editorOnLoad() {
    (editor.contentWindow as any).loadOptions(loadOptions());
    (editor.contentWindow as any).wetty_close_config = () => { optionsElem!.classList.toggle('opened'); };
    (editor.contentWindow as any).wetty_save_config = (newConfig: any) => { onInput(term, newConfig); };
  }
  if ((editor.contentDocument || editor.contentWindow!.document).readyState === "complete") editorOnLoad();
  editor.addEventListener("load", editorOnLoad);

  toggle.addEventListener('click', e => {
    (editor.contentWindow as any).loadOptions(loadOptions());
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
	return (loadOptions() as any).wettyFitTerminal ?? true;	
}
