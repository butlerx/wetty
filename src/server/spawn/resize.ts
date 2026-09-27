/**
 * Upper bound on the terminal size a client may request. Well above any real
 * display, but low enough that a hostile value cannot be used to make node-pty
 * allocate an absurd buffer.
 */
const maxDimension = 9999;

export interface Dimensions {
  cols: number;
  rows: number;
}

const isPositiveDimension = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value > 0 &&
  value <= maxDimension;

/**
 * Validate a client supplied terminal size.
 *
 * The payload arrives straight off the socket, so it may be missing, of the
 * wrong type, or hold values node-pty rejects. Returns undefined for anything
 * unusable so the caller can drop the event instead of throwing.
 */
export function parseDimensions(payload: unknown): Dimensions | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const { cols, rows } = payload as Partial<Dimensions>;
  if (!isPositiveDimension(cols) || !isPositiveDimension(rows)) {
    return undefined;
  }
  return { cols, rows };
}
