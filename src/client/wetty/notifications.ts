import { Beeper } from './notifications/beeper';
import { FaviconBlinker } from './notifications/favicon';
import { serviceWorker } from './serviceWorker';

const DEFAULT_TITLE = 'Terminal';

/**
 * Parse an OSC 777 payload (`notify;<title>;<body>`). The body is the rest of
 * the payload, so it may itself contain semicolons.
 *
 * @param data - payload after `OSC 777 ;`
 * @returns title and body, or undefined for commands other than `notify`
 */
export function parseOsc777(
  data: string,
): { title: string; body: string } | undefined {
  const [command, title, ...body] = data.split(';');
  if (command !== 'notify') return undefined;
  return { title: title || DEFAULT_TITLE, body: body.join(';') };
}

/**
 * Desktop notifications raised by the remote shell through OSC escape
 * sequences:
 *   OSC 9   ; <body>                    ST  (iTerm2, silent)
 *   OSC 777 ; notify ; <title> ; <body> ST  (urxvt, with a beep)
 */
export class Notifier {
  private static readonly permissionTargets = new WeakSet<HTMLElement>();
  private readonly beeper = new Beeper();
  private readonly blinker = new FaviconBlinker();

  /** Handle an OSC 9 payload. */
  public osc9(data: string): boolean {
    this.notify(DEFAULT_TITLE, data);
    return true;
  }

  /** Handle an OSC 777 payload; only the `notify` command is supported. */
  public osc777(data: string): boolean {
    const notification = parseOsc777(data);
    if (!notification) return false;
    this.notify(notification.title, notification.body, true);
    return true;
  }

  /**
   * Ask for notification permission on the first click inside `element`;
   * browsers only allow the prompt in response to a user gesture.
   */
  public static requestPermissionOnClick(element: HTMLElement): void {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    if (Notifier.permissionTargets.has(element)) return;
    Notifier.permissionTargets.add(element);
    element.addEventListener(
      'click',
      () => {
        Notifier.permissionTargets.delete(element);
        if (Notification.permission === 'default') {
          void Notification.requestPermission();
        }
      },
      { once: true },
    );
  }

  private notify(title: string, body: string, sound = false): void {
    this.blinker.start();
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (sound) this.beeper.beep();
    // Sound is controlled by `sound` alone, never by the OS default.
    const options: NotificationOptions = { body, silent: true };
    try {
      // eslint-disable-next-line no-new
      new Notification(title, options);
    } catch {
      // Chrome on Android (and some other browsers) only allow notifications
      // from a service worker and throw when constructing one directly.
      void serviceWorker
        .then((registration) => registration?.showNotification(title, options))
        .catch(() => undefined);
    }
  }
}
