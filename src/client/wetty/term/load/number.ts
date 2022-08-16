import type { Option } from '../options/types';
import { optionLabel } from './boolean/labels';

export function numberOption(option: Option): HTMLElement {
  const divElement = document.createElement('div');
  divElement.className = 'number_option';
  const labelElement = optionLabel(option);
  divElement.appendChild(labelElement);
  const inputElement = document.createElement('input');
  divElement.appendChild(inputElement);
  inputElement.type = 'number';
  inputElement.size = 10;
  if (option.float === true) inputElement.setAttribute('step', '0.001');
  if (typeof option.min === 'number') {
    inputElement.setAttribute('min', option.min.toString());
  }
  if (typeof option.max === 'number') {
    inputElement.setAttribute('max', option.max.toString());
  }

  function numberGet(this: Option): number {
    const valueStr = inputElement.value;
    let value = (this.float === true ? parseFloat : parseInt)(valueStr);
    if (Number.isNaN(value) || typeof value !== 'number') value = 0;
    if (typeof this.min === 'number') value = Math.max(value, this.min);
    if (typeof this.max === 'number') value = Math.min(value, this.max);
    return value;
  }

  function numberSet(this: Option, value: number) {
    inputElement.value = value.toString();
  }

  option.get = numberGet.bind(option);
  option.set = numberSet.bind(option);

  return divElement;
}
