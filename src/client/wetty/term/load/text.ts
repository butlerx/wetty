import type { Option, confValue } from '../options/types';
import { optionLabel } from './boolean/labels';

export function textOption(option: Option): HTMLElement {
  const divElement = document.createElement('div');
  divElement.className = 'text_option';
  const labelElement = optionLabel(option);
  divElement.appendChild(labelElement);
  const inputElement = document.createElement('input');
  divElement.appendChild(inputElement);
  inputElement.type = 'text';

  function textGet(this: Option): confValue {
    return inputElement.value;
  }

  function textSet(this: Option, value: confValue): void {
    inputElement.value = value.toString();
  }

  option.get = textGet.bind(option);
  option.set = textSet.bind(option);

  return divElement;
}
