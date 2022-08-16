import type { Option } from '../options/types';
import { optionLabel } from './boolean/labels';

export function booleanOption(option: Option): HTMLElement {
  const divElement = document.createElement('div');
  divElement.className = 'boolean_option';
  const labelElement = optionLabel(option);
  divElement.appendChild(labelElement);
  const inputElement = document.createElement('input');
  inputElement.type = 'checkbox';
  divElement.appendChild(inputElement);

  function boolGet(this: Option): boolean {
    return inputElement.checked;
  }

  function boolSet(this: Option, value: boolean): void {
    inputElement.checked = value;
  }

  option.get = boolGet.bind(option);
  option.set = boolSet.bind(option);

  return divElement;
}
