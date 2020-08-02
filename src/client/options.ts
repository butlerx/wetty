import { isUndefined } from 'lodash';

export function loadOptions(): object {
  const defaultOptions = { fontSize: 14 };
  try {
    return isUndefined(localStorage.options)
      ? defaultOptions
      : JSON.parse(localStorage.options);
  } catch {
    return defaultOptions;
  }
}
