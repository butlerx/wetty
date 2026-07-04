import { overlay } from './disconnect/elements';
import { verifyPrompt } from './disconnect/verify';

export function disconnect(reason?: string): void {
  if (overlay === null) return;
  overlay.style.display = 'block';
  const msg = document.getElementById('msg');
  if (msg !== null) msg.textContent = reason ?? 'Session ended';
  window.removeEventListener('beforeunload', verifyPrompt, false);
}
