import type { Term } from '../term';

const ctrlButton = document.getElementById('onscreen-ctrl');
let ctrlFlag = false;

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

export function registerKeyboardHandlers(): void {
  window.toggleFunctions = toggleFunctions;
  window.toggleCTRL = toggleCTRL;
  window.pressESC = pressESC;
  window.pressUP = pressUP;
  window.pressDOWN = pressDOWN;
  window.pressTAB = pressTAB;
  window.pressLEFT = pressLEFT;
  window.pressRIGHT = pressRIGHT;
}
