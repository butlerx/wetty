import { FitAddon } from '@xterm/addon-fit';
import { ImageAddon } from '@xterm/addon-image';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';

import { terminal as termElement } from './disconnect/elements';
import { Notifier } from './notifications';
import { configureTerm } from './term/configuration';
import { loadOptions } from './term/load';
import { setTitle } from './title';
import type { Options } from './term/options';
import type { Socket } from 'socket.io-client';

const isMobile =
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  );
const isWindows = /Windows/i.test(navigator.userAgent);

export class Term extends Terminal {
  socket: Socket;
  fitAddon: FitAddon;
  loadOptions: () => Options;
  private configurationDisposer?: () => void;
  private sessionDisposed = false;

  constructor(socket: Socket, notifier: Notifier) {
    super({ allowProposedApi: true });
    this.socket = socket;
    this.fitAddon = new FitAddon();
    this.loadAddon(this.fitAddon);
    this.loadAddon(new WebLinksAddon());
    this.loadAddon(new ImageAddon());
    this.loadOptions = loadOptions;
    // Use xterm's DOM renderer on Windows to avoid mis-scaled TUI rendering.
    if (!isMobile && !isWindows) {
      try {
        this.loadAddon(new WebglAddon());
      } catch {
        // WebGL not available — DOM renderer will be used
      }
    }
    this.parser.registerOscHandler(9, (data) => notifier.osc9(data));
    this.parser.registerOscHandler(777, (data) => notifier.osc777(data));
    this.onTitleChange(setTitle);
  }

  resizeTerm(): void {
    this.refresh(0, this.rows - 1);
    if (this.shouldFitTerm) this.fitAddon.fit();
    this.socket.emit('resize', { cols: this.cols, rows: this.rows });
  }

  get shouldFitTerm(): boolean {
    return this.loadOptions().wettyFitTerminal;
  }

  setConfigurationDisposer(disposer: () => void): void {
    this.configurationDisposer = disposer;
  }

  override dispose(): void {
    if (this.sessionDisposed) return;
    this.sessionDisposed = true;
    this.configurationDisposer?.();
    this.configurationDisposer = undefined;
    super.dispose();
  }
}

const ctrlButton = document.getElementById('onscreen-ctrl');
let ctrlFlag = false; // This indicates whether the CTRL key is pressed or not

/**
 * Toggles the state of the `ctrlFlag` variable and updates the visual state
 * of the `ctrlButton` element accordingly. If `ctrlFlag` is set to `true`,
 * the `active` class is added to the `ctrlButton`; otherwise, it is removed.
 * After toggling, the terminal (`wetty_term`) is focused if it exists.
 */
const toggleCTRL = (): void => {
  ctrlFlag = !ctrlFlag;
  if (ctrlButton) {
    if (ctrlFlag) {
      ctrlButton.classList.add('active');
    } else {
      ctrlButton.classList.remove('active');
    }
  }
  window.wetty_term?.focus();
};

/**
 * Handles the keyup event for the CTRL key. Delayed work remains bound to the
 * terminal that scheduled it so a reconnect cannot redirect it to a new term.
 *
 * @param event - the keyboard event object.
 */
function handleControlKeyUp(event: KeyboardEvent): void {
  if (!ctrlFlag) return;
  const targetTerm = window.wetty_term;
  if (event.key.length === 1 && /^[a-zA-Z0-9]$/.exec(event.key)) {
    targetTerm?.input(
      String.fromCharCode(event.key.toUpperCase().charCodeAt(0) - 64),
      false,
    );
    setTimeout(() => {
      if (window.wetty_term === targetTerm) targetTerm?.input('\x7F', true);
    }, 100);
  }
  toggleCTRL();
}

document.addEventListener('keyup', handleControlKeyUp);

/**
 * Simulates pressing the ESC key by sending the ESC character (ASCII code 27)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the ESC character, the terminal is focused.
 */
const pressESC = (): void => {
  if (ctrlFlag) {
    toggleCTRL();
  }
  window.wetty_term?.input('\x1B', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the UP arrow key by sending the UP character (ASCII code 65)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the UP character, the terminal is focused.
 */
const pressUP = (): void => {
  if (ctrlFlag) {
    toggleCTRL();
  }
  window.wetty_term?.input('\x1B[A', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the DOWN arrow key by sending the DOWN character (ASCII code 66)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the DOWN character, the terminal is focused.
 */
const pressDOWN = (): void => {
  if (ctrlFlag) {
    toggleCTRL();
  }
  window.wetty_term?.input('\x1B[B', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the TAB key by sending the TAB character (ASCII code 9)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the TAB character, the terminal is focused.
 */
const pressTAB = (): void => {
  if (ctrlFlag) {
    toggleCTRL();
  }
  window.wetty_term?.input('\x09', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the LEFT arrow key by sending the LEFT character (ASCII code 68)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the LEFT character, the terminal is focused.
 */
const pressLEFT = (): void => {
  if (ctrlFlag) {
    toggleCTRL();
  }
  window.wetty_term?.input('\x1B[D', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the RIGHT arrow key by sending the RIGHT character (ASCII code 67)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the RIGHT character, the terminal is focused.
 */
const pressRIGHT = (): void => {
  if (ctrlFlag) {
    toggleCTRL();
  }
  window.wetty_term?.input('\x1B[C', false);
  window.wetty_term?.focus();
};

/**
 * Toggles the visibility of the onscreen buttons by adding or removing
 * the 'active' class to the element with the ID 'onscreen-buttons'.
 */
const toggleFunctions = (): void => {
  const element = document.querySelector(
    'div#functions > div.onscreen-buttons',
  );
  if (element?.classList.contains('active')) {
    element.classList.remove('active');
  } else {
    element?.classList.add('active');
    document.getElementById('options')?.classList.remove('opened');
  }
};

declare global {
  interface Window {
    wetty_term?: Term;
    clipboardData: DataTransfer;
    toggleFunctions?: () => void;
    toggleCTRL?: () => void;
    pressESC?: () => void;
    pressUP?: () => void;
    pressDOWN?: () => void;
    pressTAB?: () => void;
    pressLEFT?: () => void;
    pressRIGHT?: () => void;
  }
}

window.toggleFunctions = toggleFunctions;
window.toggleCTRL = toggleCTRL;
window.pressESC = pressESC;
window.pressUP = pressUP;
window.pressDOWN = pressDOWN;
window.pressTAB = pressTAB;
window.pressLEFT = pressLEFT;
window.pressRIGHT = pressRIGHT;

export function terminal(socket: Socket, notifier: Notifier): Term | undefined {
  const term = new Term(socket, notifier);
  if (termElement === null) {
    term.dispose();
    return undefined;
  }
  try {
    termElement.innerHTML = '';
    term.open(termElement);
    term.setConfigurationDisposer(configureTerm(term));
    Notifier.requestPermissionOnClick(termElement);
    return term;
  } catch (error) {
    term.dispose();
    throw error;
  }
}
