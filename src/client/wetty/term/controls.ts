interface ControlTerminal {
  focus(): void;
  input(data: string, wasUserInput?: boolean): void;
}

let ctrlFlag = false; // This indicates whether the CTRL key is pressed or not

function controlButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#onscreen-ctrl');
}

/**
 * Toggles the state of the `ctrlFlag` variable and updates the visual state
 * of the `ctrlButton` element accordingly. If `ctrlFlag` is set to `true`,
 * the `active` class is added to the `ctrlButton`; otherwise, it is removed.
 * After toggling, the terminal (`wetty_term`) is focused if it exists.
 */
export const toggleCTRL = (): void => {
  ctrlFlag = !ctrlFlag;
  const button = controlButton();
  if (button) {
    if (ctrlFlag) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
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
export function handleControlKeyUp(event: KeyboardEvent): void {
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
export const pressESC = (): void => {
  if (ctrlFlag) toggleCTRL();
  window.wetty_term?.input('\x1B', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the UP arrow key by sending the UP character (ASCII code 65)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the UP character, the terminal is focused.
 */
export const pressUP = (): void => {
  if (ctrlFlag) toggleCTRL();
  window.wetty_term?.input('\x1B[A', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the DOWN arrow key by sending the DOWN character (ASCII code 66)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the DOWN character, the terminal is focused.
 */
export const pressDOWN = (): void => {
  if (ctrlFlag) toggleCTRL();
  window.wetty_term?.input('\x1B[B', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the TAB key by sending the TAB character (ASCII code 9)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the TAB character, the terminal is focused.
 */
export const pressTAB = (): void => {
  if (ctrlFlag) toggleCTRL();
  window.wetty_term?.input('\x09', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the LEFT arrow key by sending the LEFT character (ASCII code 68)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the LEFT character, the terminal is focused.
 */
export const pressLEFT = (): void => {
  if (ctrlFlag) toggleCTRL();
  window.wetty_term?.input('\x1B[D', false);
  window.wetty_term?.focus();
};

/**
 * Simulates pressing the RIGHT arrow key by sending the RIGHT character (ASCII code 67)
 * to the terminal. If the CTRL key is active, it toggles the CTRL state off.
 * After sending the RIGHT character, the terminal is focused.
 */
export const pressRIGHT = (): void => {
  if (ctrlFlag) toggleCTRL();
  window.wetty_term?.input('\x1B[C', false);
  window.wetty_term?.focus();
};

/**
 * Toggles the visibility of the onscreen buttons by adding or removing
 * the 'active' class to the element with the ID 'onscreen-buttons'.
 */
export const toggleFunctions = (): void => {
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
    wetty_term?: ControlTerminal;
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
