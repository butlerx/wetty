import _ from 'lodash';

export function mobileKeyboard(): void {
  const [screen] = Array.from(document.getElementsByClassName('xterm-screen'));
  if (_.isNull(screen)) return;
  screen.setAttribute('contenteditable', 'true');
  screen.setAttribute('spellcheck', 'false');
  screen.setAttribute('autocorrect', 'false');
  screen.setAttribute('autocomplete', 'false');
  screen.setAttribute('autocapitalize', 'false');
  /*
    term.scrollPort_.screen_.setAttribute('contenteditable', 'false');
  */
}
