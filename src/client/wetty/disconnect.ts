import _ from 'lodash';
import { verifyPrompt } from '../shared/verify.js';
import { overlay } from '../shared/elements.js';

export function disconnect(reason: string): void {
  if (_.isNull(overlay)) return;
  overlay.style.display = 'block';
  const msg = document.getElementById('msg');
  if (!_.isUndefined(reason) && !_.isNull(msg)) msg.innerHTML = reason;
  window.removeEventListener('beforeunload', verifyPrompt, false);
}
