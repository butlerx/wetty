import {
  decodeEditorLoadMessage,
  isOptions,
  type EditorCloseMessage,
  type EditorSaveMessage,
} from './messages';
import type { Options } from '../wetty/term/options';

export type OptionType = 'boolean' | 'color' | 'enum' | 'number' | 'text';
export type OptionValue =
  | boolean
  | number
  | string
  | null
  | OptionValue[]
  | { [key: string]: OptionValue };

export interface OptionDefinition {
  type: OptionType;
  name: string;
  description: string;
  path: readonly string[];
  enum?: readonly string[];
  float?: boolean;
  json?: boolean;
  max?: number;
  min?: number;
  nullable?: boolean;
  el?: HTMLElement;
  get?: () => OptionValue;
  set?: (value: unknown) => void;
}

export interface RegisteredOption extends OptionDefinition {
  el: HTMLElement;
  get: () => OptionValue;
  set: (value: unknown) => void;
}

declare global {
  interface Window {
    closeConfig: () => void;
  }
}

const allOptions: RegisteredOption[] = [];

function requireElement(parent: ParentNode, selector: string): HTMLElement {
  const element = parent.querySelector<HTMLElement>(selector);
  if (element == null) throw new Error(`Missing editor element: ${selector}`);
  return element;
}

function optionInput(option: OptionDefinition): HTMLInputElement {
  if (option.el == null) {
    throw new Error(`Option was not rendered: ${option.name}`);
  }
  return requireElement(option.el, 'input') as HTMLInputElement;
}

function optionSelect(option: OptionDefinition): HTMLSelectElement {
  if (option.el == null) {
    throw new Error(`Option was not rendered: ${option.name}`);
  }
  return requireElement(option.el, 'select') as HTMLSelectElement;
}

function optionGenericGet(option: OptionDefinition): string {
  return optionInput(option).value;
}

function optionGenericSet(option: OptionDefinition, value: unknown): void {
  if (value == null) {
    optionInput(option).value = '';
    return;
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected text value for ${option.name}`);
  }
  optionInput(option).value = value;
}

function optionEnumGet(option: OptionDefinition): string {
  return optionSelect(option).value;
}

function optionEnumSet(option: OptionDefinition, value: unknown): void {
  optionSelect(option).value = String(value);
}

function optionBoolGet(option: OptionDefinition): boolean {
  return optionInput(option).checked;
}

function optionBoolSet(option: OptionDefinition, value: unknown): void {
  optionInput(option).checked = Boolean(value);
}

function optionNumberGet(option: OptionDefinition): number {
  const inputValue = optionInput(option).value;
  let value =
    option.float === true ? parseFloat(inputValue) : parseInt(inputValue, 10);
  if (Number.isNaN(value)) value = 0;
  if (option.min !== undefined) value = Math.max(value, option.min);
  if (option.max !== undefined) value = Math.min(value, option.max);
  return value;
}

function optionNumberSet(option: OptionDefinition, value: unknown): void {
  optionInput(option).value = String(value);
}

function templateClone(selector: string): HTMLElement {
  return requireElement(document, selector).cloneNode(true) as HTMLElement;
}

function copyChildren(source: HTMLElement, target: HTMLElement): void {
  while (source.children.length > 0) target.append(source.children[0]);
}

export function inflateOptions(
  optionsSchema: OptionDefinition[],
  target: HTMLElement,
): void {
  optionsSchema.forEach((option) => {
    let wrapper: HTMLElement;
    option.get = () => optionGenericGet(option);
    option.set = (value) => {
      optionGenericSet(option, value);
    };

    switch (option.type) {
      case 'boolean':
        wrapper = templateClone('#boolean_option.templ');
        option.get = () => optionBoolGet(option);
        option.set = (value) => {
          optionBoolSet(option, value);
        };
        break;
      case 'enum': {
        wrapper = templateClone('#enum_option.templ');
        const select = requireElement(wrapper, 'select') as HTMLSelectElement;
        option.enum?.forEach((variant) => {
          const optionElement = document.createElement('option');
          optionElement.innerText = variant;
          optionElement.value = variant;
          select.appendChild(optionElement);
        });
        option.get = () => optionEnumGet(option);
        option.set = (value) => {
          optionEnumSet(option, value);
        };
        break;
      }
      case 'text':
        wrapper = templateClone('#text_option.templ');
        break;
      case 'number': {
        wrapper = templateClone('#number_option.templ');
        const input = requireElement(wrapper, 'input') as HTMLInputElement;
        if (option.float === true) input.setAttribute('step', '0.001');
        if (option.min !== undefined) {
          input.setAttribute('min', String(option.min));
        }
        if (option.max !== undefined) {
          input.setAttribute('max', String(option.max));
        }
        option.get = () => optionNumberGet(option);
        option.set = (value) => {
          optionNumberSet(option, value);
        };
        break;
      }
      case 'color':
        wrapper = templateClone('#color_option.templ');
        break;
      default: {
        const exhaustive: never = option.type;
        throw new Error(`Unknown option type ${String(exhaustive)}`);
      }
    }

    option.el = requireElement(wrapper, ':scope > div');
    requireElement(option.el, '.title').innerText = option.name;
    requireElement(option.el, '.desc').innerText = option.description;
    option.el.dataset.optionName = option.name;
    copyChildren(wrapper, target);
    allOptions.push(option as RegisteredOption);
  });
}

function isOptionValue(value: unknown): value is OptionValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isOptionValue);
  if (typeof value !== 'object') return false;
  return Object.values(value).every(isOptionValue);
}

function getItem(
  value: unknown,
  path: readonly string[],
): OptionValue | undefined {
  if (path.length === 0) return isOptionValue(value) ? value : undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const [key, ...remainingPath] = path;
  return getItem((value as Record<string, unknown>)[key], remainingPath);
}

function setItem(
  value: Record<string, unknown>,
  path: readonly string[],
  item: OptionValue,
): void {
  const [key, ...remainingPath] = path;
  if (remainingPath.length === 0) {
    value[key] = item;
    return;
  }
  const child = value[key];
  if (typeof child !== 'object' || child === null || Array.isArray(child)) {
    value[key] = {};
  }
  setItem(value[key] as Record<string, unknown>, remainingPath, item);
}

export function loadOptions(config: Options): void {
  allOptions.forEach((option) => {
    let value = getItem(config, option.path);
    if (option.nullable === true && option.type === 'text' && value == null) {
      value = null;
    } else if (
      option.nullable === true &&
      option.type === 'number' &&
      value == null
    ) {
      value = -1;
    } else if (value == null) {
      return;
    }
    if (option.json === true && option.type === 'text') {
      value = JSON.stringify(value);
    }
    option.set(value);
    option.el.classList.remove('unbounded');
  });
}

export function saveConfig(): void {
  const newConfig: Record<string, unknown> = {};
  const hasInvalidJson = allOptions.some((option) => {
    let newValue = option.get();
    if (
      option.nullable === true &&
      ((option.type === 'text' && newValue === '') ||
        (option.type === 'number' &&
          typeof newValue === 'number' &&
          newValue < 0))
    ) {
      return false;
    }
    if (option.json === true && option.type === 'text') {
      if (typeof newValue !== 'string') return true;
      try {
        const parsedValue: unknown = JSON.parse(newValue);
        if (!isOptionValue(parsedValue)) return true;
        newValue = parsedValue;
      } catch {
        return true;
      }
    }
    setItem(newConfig, option.path, newValue);
    return false;
  });
  if (hasInvalidJson || !isOptions(newConfig)) return;
  const message: EditorSaveMessage = { type: 'wetty:save', config: newConfig };
  window.parent.postMessage(message, window.location.origin);
}

export function closeConfig(): void {
  const message: EditorCloseMessage = { type: 'wetty:close' };
  window.parent.postMessage(message, window.location.origin);
}

export function initializeEditor(): void {
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (
      event.origin !== window.location.origin ||
      event.source !== window.parent
    ) {
      return;
    }
    const message = decodeEditorLoadMessage(event.data);
    if (message !== null) loadOptions(message.config);
  });
  window.addEventListener('input', saveConfig);
  window.closeConfig = closeConfig;

  if (window.top === window) {
    // eslint-disable-next-line no-alert -- Preserve the existing iframe-only warning.
    alert(
      'Error: Page is top level. This page is supposed to be accessed from inside WeTTY.',
    );
  }
}
