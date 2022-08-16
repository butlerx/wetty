import type { Option, confValue } from '../options/types';
import { optionLabel } from './boolean/labels';

export function colorOption(option: Option): HTMLElement {
  const divElement = document.createElement('div');
  divElement.className = 'color_option';
  const labelElement = optionLabel(option);
  divElement.appendChild(labelElement);
  const inputElement = document.createElement('input');
  divElement.appendChild(inputElement);
  inputElement.type = 'color';

  function colorGet(this: Option): confValue {
    return inputElement.value;
  }

  function colorSet(this: Option, value: confValue): void {
    inputElement.value = value.toString();
  }

  option.get = colorGet.bind(option);
  option.set = colorSet.bind(option);
  return divElement;
}
