import { open, defaultTheme } from 'rioterm';

import { terminal as termElement } from './disconnect/elements';
import { configureTerm } from './term/configuration';
import { loadOptions } from './term/load';
import { setTitle } from './title';
import type { Options, XTerm } from './term/options';
import type { RioTermHandle, Theme, OpenOptions } from 'rioterm';
import type { Socket } from 'socket.io-client';

/*
 * Terminal backed by rioterm: Rio terminal's Rust VT engine compiled to
 * WebAssembly. Config changes re-open the renderer and replay the buffer
 * via serialize(), which keeps scrollback, styles, and links.
 */
export class Term {
  socket: Socket;
  loadOptions: () => Options;

  private handle!: RioTermHandle;
  private container: HTMLElement;
  private conf: XTerm;
  private dataCallback?: (data: string) => void;
  private resizeCallback?: (size: { cols: number; rows: number }) => void;
  private decoder = new TextDecoder();
  private lastSize = { cols: 0, rows: 0 };
  private reopening: Promise<void> = Promise.resolve();

  private constructor(socket: Socket, container: HTMLElement) {
    this.socket = socket;
    this.container = container;
    this.loadOptions = loadOptions;
    this.conf = loadOptions().xterm;
  }

  static async create(socket: Socket, container: HTMLElement): Promise<Term> {
    const term = new Term(socket, container);
    await term.openTerminal();
    return term;
  }

  private rioOptions(): OpenOptions {
    const { conf } = this;
    const options: OpenOptions = {
      renderer: 'canvas',
      // resizeTerm drives sizing so the socket learns about new dims
      fit: false,
      autoFocus: false,
      theme: {
        ...defaultTheme,
        ...((conf.theme ?? {}) as Partial<Theme>),
      },
    };
    if (typeof conf.fontSize === 'number') options.fontSize = conf.fontSize;
    if (typeof conf.fontFamily === 'string') {
      options.fontFamily = conf.fontFamily;
    }
    if (typeof conf.lineHeight === 'number') {
      options.lineHeight = conf.lineHeight;
    }
    if (typeof conf.scrollback === 'number') {
      options.scrollback = conf.scrollback;
    }
    if (
      conf.cursorStyle === 'block' ||
      conf.cursorStyle === 'underline' ||
      conf.cursorStyle === 'bar'
    ) {
      options.cursorStyle = conf.cursorStyle;
    }
    if (typeof conf.cols === 'number' && typeof conf.rows === 'number') {
      options.cols = conf.cols;
      options.rows = conf.rows;
    }
    return options;
  }

  private async openTerminal(replay?: string): Promise<void> {
    this.handle = await open(this.container, this.rioOptions());
    this.handle.terminal.onTitleChange((title: string) => {
      setTitle(title);
    });
    this.handle.terminal.onData((bytes: Uint8Array) => {
      this.dataCallback?.(this.decoder.decode(bytes));
    });
    if (replay) this.handle.terminal.write(replay);
  }

  /*
   * Merge config from the options editor and re-open the renderer with
   * it. Re-opens are chained so rapid saves cannot race each other.
   */
  applyConfig(conf: XTerm): Promise<void> {
    this.conf = { ...this.conf, ...conf };
    this.reopening = this.reopening.then(async () => {
      const replay = this.handle.terminal.serialize();
      this.handle.dispose();
      await this.openTerminal(replay);
      this.focus();
    });
    return this.reopening;
  }

  resizeTerm(): void {
    if (this.shouldFitTerm) {
      this.handle.renderer.fit(
        this.container.clientWidth,
        this.container.clientHeight,
      );
    }
    const { cols, rows } = this.handle.terminal.options;
    this.socket.emit('resize', { cols, rows });
    if (cols !== this.lastSize.cols || rows !== this.lastSize.rows) {
      this.lastSize = { cols, rows };
      this.resizeCallback?.({ cols, rows });
    }
  }

  get shouldFitTerm(): boolean {
    return this.loadOptions().wettyFitTerminal;
  }

  onData(callback: (data: string) => void): void {
    this.dataCallback = callback;
  }

  onResize(callback: (size: { cols: number; rows: number }) => void): void {
    this.resizeCallback = callback;
  }

  /*
   * Flow control counts on a completion signal per write; rioterm writes
   * parse synchronously, so the callback runs as soon as write returns.
   */
  write(data: string | Uint8Array, callback?: () => void): void {
    this.handle.terminal.write(data);
    callback?.();
  }

  writeln(data: string): void {
    this.handle.terminal.write(`${data}\r\n`);
  }

  input(data: string, _wasUserInput = false): void {
    this.handle.terminal.input(data);
  }

  resize(cols: number, rows: number): void {
    this.handle.terminal.resize(cols, rows);
  }

  getSelection(): string {
    return this.handle.terminal.getSelection() ?? '';
  }

  hasSelection(): boolean {
    return this.getSelection() !== '';
  }

  focus(): void {
    this.handle.focus();
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
 * Simulates a backspace key press by sending the backspace character
 * (ASCII code 127) to the terminal. This function is intended to be used
 * in conjunction with the `simulateCTRLAndKey` function to handle
 * keyboard shortcuts.
 *
 */
const simulateBackspace = (): void => {
  window.wetty_term?.input('\x7F', true);
};

/**
 * Simulates a CTRL + key press by sending the corresponding character
 * (converted from the key's ASCII code) to the terminal. This function
 * is intended to be used in conjunction with the `toggleCTRL` function
 * to handle keyboard shortcuts.
 *
 * @param key - The key that was pressed, which will be converted to
 *              its corresponding character code.
 */
const simulateCTRLAndKey = (key: string): void => {
  window.wetty_term?.input(
    String.fromCharCode(key.toUpperCase().charCodeAt(0) - 64),
    false,
  );
};

/**
 * Handles the keydown event for the CTRL key. When the CTRL key is pressed,
 * it sets the `ctrlFlag` variable to true and updates the visual state of
 * the `ctrlButton` element. If the CTRL key is released, it sets `ctrlFlag`
 * to false and updates the visual state of the `ctrlButton` element.
 *
 * @param e - The keyboard event object.
 */
document.addEventListener('keyup', (e) => {
  if (ctrlFlag) {
    // if key is a character
    if (e.key.length === 1 && /^[a-zA-Z0-9]$/.exec(e.key)) {
      simulateCTRLAndKey(e.key);
      // delayed backspace is needed to remove the character added to the terminal
      // when CTRL + key is pressed.
      // this is a workaround because e.preventDefault() cannot be used.
      setTimeout(() => {
        simulateBackspace();
      }, 100);
    }
    toggleCTRL();
  }
});

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

export async function terminal(socket: Socket): Promise<Term | undefined> {
  if (termElement === null) return undefined;
  termElement.innerHTML = '';
  const term = await Term.create(socket, termElement);
  configureTerm(term);
  window.onresize = function onResize() {
    term.resizeTerm();
  };
  window.wetty_term = term;
  window.toggleFunctions = toggleFunctions;
  window.toggleCTRL = toggleCTRL;
  window.pressESC = pressESC;
  window.pressUP = pressUP;
  window.pressDOWN = pressDOWN;
  window.pressTAB = pressTAB;
  window.pressLEFT = pressLEFT;
  window.pressRIGHT = pressRIGHT;
  return term;
}
