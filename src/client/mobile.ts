import { isNull } from 'lodash';

export function mobileKeyboard(): void {
  const [screen] = document.getElementsByClassName('xterm-screen');
  if (isNull(screen)) return;
  screen.setAttribute('contenteditable', 'true');
  screen.setAttribute('spellcheck', 'false');
  screen.setAttribute('autocorrect', 'false');
  screen.setAttribute('autocomplete', 'false');
  screen.setAttribute('autocapitalize', 'false');
  /*
    term.scrollPort_.screen_.setAttribute('contenteditable', 'false');
  */
}
