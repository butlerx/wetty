import _ from 'lodash';

export function loadOptions(): object {
  const defaultOptions = { xterm: { fontSize: 14 } };
  try {
    return _.isUndefined(localStorage.options)
      ? defaultOptions
      : JSON.parse(localStorage.options);
  } catch {
    return defaultOptions;
  }
}
