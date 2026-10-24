/**
 * Alternates the favicon between the normal and the alert icon while the tab
 * is in the background, and restores it once the tab is focused again.
 */
export class FaviconBlinker {
  private interval: number | undefined;
  private alertShown = false;
  private baseHref: string | undefined;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.stop();
    });
    window.addEventListener('focus', () => {
      this.stop();
    });
  }

  public start(): void {
    if (this.interval !== undefined) return;
    if (!document.hidden && document.hasFocus()) return;
    this.baseHref ??= FaviconBlinker.link()?.href;
    const { baseHref } = this;
    if (!baseHref) return;
    const alertHref = baseHref.replace('favicon.svg', 'favicon-alert.svg');
    this.alertShown = false;
    this.interval = window.setInterval(() => {
      this.alertShown = !this.alertShown;
      FaviconBlinker.set(this.alertShown ? alertHref : baseHref);
    }, 600);
  }

  public stop(): void {
    if (this.interval === undefined) return;
    window.clearInterval(this.interval);
    this.interval = undefined;
    if (this.baseHref) FaviconBlinker.set(this.baseHref);
  }

  private static link(): HTMLLinkElement | null {
    return document.querySelector<HTMLLinkElement>(
      'link[rel="icon"][type="image/svg+xml"]',
    );
  }

  private static set(href: string): void {
    const link = FaviconBlinker.link();
    if (link) link.href = href;
  }
}
