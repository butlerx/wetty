import _ from 'lodash';
import type { Options } from './shared/options';

const defaultOptions: Options = {
  xterm: { fontSize: 14 },
  wettyFitTerminal: true,
};

export function loadOptions(): Options {
  try {
    return _.isUndefined(localStorage.options)
      ? defaultOptions
      : JSON.parse(localStorage.options);
  } catch {
    return defaultOptions;
  }
}
