import _ from 'lodash';
import type { Option } from '../options/types';
import { optionLabel } from './boolean/labels';

export function enumOption(option: Option): HTMLElement {
  const divElement = document.createElement('div');
  divElement.className = 'enum_option';
  const labelElement = optionLabel(option);
  divElement.appendChild(labelElement);
  const selectElement = document.createElement('select');
  divElement.appendChild(selectElement);
  if (!_.isUndefined(option.enum)) {
    option.enum.forEach(varriant => {
      const optionEl = document.createElement('option');
      optionEl.innerText = varriant;
      optionEl.value = varriant;
      selectElement.appendChild(optionEl);
    });
  }

  function enumGet(this: Option): string {
    return selectElement.value;
  }

  function enumSet(this: Option, value: string): void {
    selectElement.value = value;
  }

  option.get = enumGet.bind(option);
  option.set = enumSet.bind(option);
  return divElement;
}
