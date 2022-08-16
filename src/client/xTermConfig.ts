import { loadOptions, saveConfig } from './colorTheme/options';

if (window.top === window) {
  // eslint-disable-next-line no-alert
  alert(
    'Error: Page is top level. This page is supposed to be accessed from inside WeTTY.',
  );
}


window.addEventListener('input', () => {
  const els = document.querySelectorAll('input, select');
  for (let i = 0; i < els.length; i += 1) {
    els[i].addEventListener('input', saveConfig);
  }
});
