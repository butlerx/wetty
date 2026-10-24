import { inflateOptions, initializeEditor, loadOptions } from './functionality';
import { advancedOptions } from './xterm_advanced_options';
import {
  colorThemeOptions,
  configureColorThemeOptions,
} from './xterm_color_theme';
import { defaultOptions } from './xterm_defaults';
import { generalOptions } from './xterm_general_options';

function requireGroup(id: string): HTMLElement {
  const group = document.getElementById(id);
  if (group == null) throw new Error(`Missing editor option group: ${id}`);
  return group;
}

inflateOptions(generalOptions, requireGroup('general_options'));
inflateOptions(colorThemeOptions, requireGroup('color_theme'));
configureColorThemeOptions();
inflateOptions(advancedOptions, requireGroup('advanced_options'));
loadOptions(defaultOptions);
initializeEditor();
