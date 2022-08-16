import type { Option } from '../../options/types';

export function optionLabel({ name, description }: Option): HTMLElement {
  const pElement = document.createElement('p');
  const titleElement = document.createElement('b');
  titleElement.className = 'title';
  titleElement.innerText = name;
  pElement.appendChild(titleElement);
  const breakElement = document.createElement('br');
  pElement.appendChild(breakElement);
  const descElement = document.createElement('span');
  descElement.className = 'desc';
  descElement.innerText = description;
  pElement.appendChild(descElement);
  return pElement;
}
