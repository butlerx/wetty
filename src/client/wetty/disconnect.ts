import { overlay } from './disconnect/elements';
import { verifyPrompt } from './disconnect/verify';
import { resetTitle } from './title';

export function disconnect(reason?: string): void {
  window.removeEventListener('beforeunload', verifyPrompt, false);
  resetTitle();
  if (overlay === null) return;
  overlay.style.display = 'block';
  const msg = document.getElementById('msg');
  if (msg !== null) msg.textContent = reason ?? 'Session ended';
}
