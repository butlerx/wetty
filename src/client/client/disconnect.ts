import { isNull, isUndefined } from '../../web_modules/lodash.js';
import { verifyPrompt } from '../shared/verify.js';
import { overlay } from '../shared/elements.js';

export function disconnect(reason: string): void {
  if (isNull(overlay)) return;
  overlay.style.display = 'block';
  const msg = document.getElementById('msg');
  if (!isUndefined(reason) && !isNull(msg)) msg.innerHTML = reason;
  window.removeEventListener('beforeunload', verifyPrompt, false);
}
