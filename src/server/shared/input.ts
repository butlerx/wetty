import type { IPty } from 'node-pty';

export function writePtyInput(
  term: Pick<IPty, 'write'>,
  input: string,
  binary = false,
): void {
  term.write(binary ? Buffer.from(input, 'binary') : input);
}
