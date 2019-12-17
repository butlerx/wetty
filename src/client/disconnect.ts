import { isNull, isUndefined } from 'lodash';
import verifyPrompt from './verify';
import { overlay } from './elements';

export default function disconnect(reason: string): void {
  if (isNull(overlay)) return;
  overlay.style.display = 'block';
  const msg = document.getElementById('msg');
  if (!isUndefined(reason) && !isNull(msg)) msg.innerHTML = reason;
  window.removeEventListener('beforeunload', verifyPrompt, false);
}
