import type { Options } from './options';

export const defaultOptions: Options = {
  xterm: { fontSize: 14 },
  wettyVoid: 0,
  wettyFitTerminal: true,
};

export function loadOptions(): Options {
  try {
    const raw = localStorage.options as string | undefined;
    let options: Options =
      raw === undefined ? defaultOptions : (JSON.parse(raw) as Options);
    if (!('xterm' in options)) {
      const { xterm } = options;
      options = defaultOptions;
      options.xterm = xterm;
    }
    return options;
  } catch {
    return defaultOptions;
  }
}
