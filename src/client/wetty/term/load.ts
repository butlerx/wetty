import _ from 'lodash';
import type { XTerm, Options } from './options';
import type { Term } from '../term';
import type { Json, confValue, OptionSchema, Option } from './options/types';
import { onInput } from './load/editor';
import { booleanOption } from './load/boolean';
import { enumOption } from './load/enum';
import { textOption } from './load/text';
import { numberOption } from './load/number';
import { colorOption } from './load/color';

const DEFAULT_BELL_SOUND =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjMyLjEwNAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

export const defaultOptions: Options = {
  wettyFitTerminal: true,
  wettyVoid: 0,

  xterm: {
    cols: 80,
    rows: 24,
    cursorBlink: false,
    cursorStyle: 'block',
    cursorWidth: 1,
    bellSound: DEFAULT_BELL_SOUND,
    bellStyle: 'none',
    drawBoldTextInBrightColors: true,
    fastScrollModifier: 'alt',
    fastScrollSensitivity: 5,
    fontFamily: 'courier-new, courier, monospace',
    fontSize: 15,
    fontWeight: 'normal',
    fontWeightBold: 'bold',
    lineHeight: 1.0,
    linkTooltipHoverDuration: 500,
    letterSpacing: 0,
    logLevel: 'info',
    scrollback: 1000,
    scrollSensitivity: 1,
    screenReaderMode: false,
    macOptionIsMeta: false,
    macOptionClickForcesSelection: false,
    minimumContrastRatio: 1,
    disableStdin: false,
    allowProposedApi: true,
    allowTransparency: false,
    tabStopWidth: 8,
    rightClickSelectsWord: false,
    rendererType: 'canvas',
    windowOptions: {},
    windowsMode: false,
    wordSeparator: ' ()[]{}\',"`',
    convertEol: false,
    termName: 'xterm',
    cancelEvents: false,

    theme: {
      foreground: '#ffffff',
      background: '#000000',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: '#FFFFFF4D',

      black: '#2e3436',
      red: '#cc0000',
      green: '#4e9a06',
      yellow: '#c4a000',
      blue: '#3465a4',
      magenta: '#75507b',
      cyan: '#06989a',
      white: '#d3d7cf',
      brightBlack: '#555753',
      brightRed: '#ef2929',
      brightGreen: '#8ae234',
      brightYellow: '#fce94f',
      brightBlue: '#729fcf',
      brightMagenta: '#ad7fa8',
      brightCyan: '#34e2e2',
      brightWhite: '#eeeeec',
    },
  },
};

export function loadLocalStorage(): Options {
  try {
    let options = _.isUndefined(localStorage.options)
      ? defaultOptions
      : JSON.parse(localStorage.options);
    // Convert old options to new options
    if (!('xterm' in options)) {
      const xterm = options;
      options = defaultOptions;
      options.xterm = xterm as unknown as XTerm;
    }
    return options;
  } catch {
    return defaultOptions;
  }
}

function getItem(json: Json, path: Array<string>): unknown {
  const mypath = path[0];
  if (path.length === 1) return json[mypath];
  if (!_.isUndefined(json[mypath])) {
    return getItem(json[mypath] as Json, path.slice(1));
  }
  return null;
}

function setItem(json: Json, path: Array<string>, item: confValue): void {
  const mypath = path[0];
  if (path.length === 1) json[mypath] = item;
  else {
    if (_.isUndefined(json[mypath])) json[mypath] = {};
    setItem(json[mypath] as Json, path.slice(1), item);
  }
}

const allOptions: Array<Option> = [];

export function inflateOptions(
  title: string,
  optionsSchema: Array<OptionSchema>,
): void {
  function createElement(option: Option): HTMLElement {
    switch (option.type) {
      case 'boolean':
        return booleanOption(option);
      case 'enum':
        return enumOption(option);
      case 'text':
        return textOption(option);
      case 'number':
        return numberOption(option);
      case 'color':
        return colorOption(option);
      default:
        throw new Error(`Unknown option type ${option.type}`);
    }
  }

  const headerElement = document.createElement('h2');
  headerElement.innerText = title;
  document.body.appendChild(headerElement);

  optionsSchema.forEach((option: OptionSchema) => {
    const opt = option as Option;
    opt.el = createElement(opt);
    document.body.appendChild(opt.el);
    allOptions.push(opt);
  });
}

export const loadOptions = (): void => {
  const config = loadLocalStorage();
  allOptions.forEach(option => {
    let value = getItem(config, option.path);
    if (option.nullable === true && option.type === 'text' && _.isNull(value))
      value = null;
    else if (
      option.nullable === true &&
      option.type === 'number' &&
      _.isNull(value)
    )
      value = -1;
    else if (value == null) return;
    if (option.json === true && option.type === 'text') {
      value = JSON.stringify(value);
    }
    option.set(value);
    option.el.classList.remove('unbounded');
  });
};

export function saveConfig(term: Term) {
  const newConfig = {};
  allOptions.forEach(option => {
    let newValue = option.get();
    if (
      option.nullable === true &&
      ((option.type === 'text' && newValue === '') ||
        (option.type === 'number' && newValue < 0))
    )
      return;
    if (option.json === true && option.type === 'text')
      newValue = JSON.parse(newValue);
    setItem(newConfig, option.path, newValue);
  });
  onInput(term, newConfig as Options);
}
