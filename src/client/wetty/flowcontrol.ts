/**
 * Flow control client side.
 * For low impact on overall throughput simply commits every `ackBytes`
 * (default 2^18).
 */
export class FlowControlClient {
  public counter = 0;
  public ackBytes = 262144;

  constructor(ackBytes?: number) {
    if (ackBytes) {
      this.ackBytes = ackBytes;
    }
  }

  public needsCommit(length: number): boolean {
    this.counter += length;
    if (this.counter >= this.ackBytes) {
      this.counter -= this.ackBytes;
      return true;
    }
    return false;
  }
}
