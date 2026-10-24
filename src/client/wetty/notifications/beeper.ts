/**
 * Plays a short tone. Browsers cap AudioContext instances per page (~6 in
 * Chrome), so a single context is created lazily and reused.
 */
export class Beeper {
  private ctx: AudioContext | undefined;

  public beep(): void {
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(
        () => {
          Beeper.play(ctx);
        },
        (): void => {
          // resume can reject before user gesture; just skip the beep
        },
      );
    } else {
      Beeper.play(ctx);
    }
  }

  private context(): AudioContext | undefined {
    if (this.ctx) return this.ctx;
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctx) return undefined;
    try {
      this.ctx = new Ctx();
    } catch {
      return undefined;
    }
    return this.ctx;
  }

  private static play(ctx: AudioContext): void {
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.start();
      o.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore
    }
  }
}
