declare module '*.scss' {
  const content: string;
  export default content;
}

interface WettyTerminalControlTarget {
  focus(): void;
  input(data: string, wasUserInput?: boolean): void;
}

interface Window {
  wetty_term?: WettyTerminalControlTarget;
  clipboardData: DataTransfer;
  closeConfig?: () => void;
  toggleFunctions?: () => void;
  toggleCTRL?: () => void;
  pressESC?: () => void;
  pressUP?: () => void;
  pressDOWN?: () => void;
  pressTAB?: () => void;
  pressLEFT?: () => void;
  pressRIGHT?: () => void;
}
