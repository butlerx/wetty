import _ from 'lodash';
import type { XTerm, Options } from './options';

export const defaultOptions: Options = {
  xterm: { fontSize: 14 },
  wettyVoid: 0,
  wettyFitTerminal: true,
};

export function loadOptions(): Options {
  try {
    let options = _.isUndefined(localStorage.options)
      ? defaultOptions
      : JSON.parse(localStorage.options);
    // Convert old options to new options
    if (!('xterm' in options)) {
      const xterm = options;
      options = defaultOptions;
      options.xterm = xterm as unknown as XTerm;
    }
    return options;
  } catch {
    return defaultOptions;
  }
}
