type ControlStatus = 'idle' | 'armed';

interface ControlState {
  status: ControlStatus;
  backspaceTimer?: ReturnType<typeof setTimeout>;
}

export interface TerminalControls {
  install(): void;
  reset(): void;
}

export function createTerminalControls(
  windowTarget: Window = window,
  documentTarget: Document = document,
): TerminalControls {
  let state: ControlState = { status: 'idle' };
  let installed = false;

  function controlButton(): HTMLElement | null {
    return documentTarget.querySelector<HTMLElement>('#onscreen-ctrl');
  }

  function transition(status: ControlStatus): void {
    state = { ...state, status };
    controlButton()?.classList.toggle('active', status === 'armed');
  }

  function reset(): void {
    if (state.backspaceTimer !== undefined) {
      clearTimeout(state.backspaceTimer);
    }
    state = { status: 'idle' };
    controlButton()?.classList.remove('active');
  }

  function toggleCTRL(): void {
    transition(state.status === 'armed' ? 'idle' : 'armed');
    windowTarget.wetty_term?.focus();
  }

  function handleControlKeyUp(event: KeyboardEvent): void {
    if (state.status !== 'armed') return;
    const targetTerm = windowTarget.wetty_term;
    if (event.key.length === 1 && /^[a-zA-Z0-9]$/.exec(event.key)) {
      targetTerm?.input(
        String.fromCharCode(event.key.toUpperCase().charCodeAt(0) - 64),
        false,
      );
      if (state.backspaceTimer !== undefined) {
        clearTimeout(state.backspaceTimer);
      }
      const timer = setTimeout(() => {
        if (state.backspaceTimer === timer) {
          state = { ...state, backspaceTimer: undefined };
        }
        if (windowTarget.wetty_term === targetTerm) {
          targetTerm?.input('\x7F', true);
        }
      }, 100);
      state = { ...state, backspaceTimer: timer };
    }
    transition('idle');
  }

  function press(data: string): void {
    if (state.status === 'armed') transition('idle');
    windowTarget.wetty_term?.input(data, false);
    windowTarget.wetty_term?.focus();
  }

  function toggleFunctions(): void {
    const element = documentTarget.querySelector(
      'div#functions > div.onscreen-buttons',
    );
    if (element?.classList.contains('active')) {
      element.classList.remove('active');
    } else {
      element?.classList.add('active');
      documentTarget.querySelector('#options')?.classList.remove('opened');
    }
  }

  function install(): void {
    if (installed) return;
    installed = true;
    documentTarget.addEventListener('keyup', handleControlKeyUp);
    windowTarget.toggleFunctions = toggleFunctions;
    windowTarget.toggleCTRL = toggleCTRL;
    windowTarget.pressESC = () => {
      press('\x1B');
    };
    windowTarget.pressUP = () => {
      press('\x1B[A');
    };
    windowTarget.pressDOWN = () => {
      press('\x1B[B');
    };
    windowTarget.pressTAB = () => {
      press('\x09');
    };
    windowTarget.pressLEFT = () => {
      press('\x1B[D');
    };
    windowTarget.pressRIGHT = () => {
      press('\x1B[C');
    };
  }

  return { install, reset };
}
