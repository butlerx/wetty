/** Terminal dimensions sent by the browser when xterm is resized. */
export interface TerminalDimensions {
  cols: number;
  rows: number;
}

/** Application events emitted by the browser and consumed by the server. */
export interface ClientToServerEvents {
  input(input: string, binary?: boolean): void;
  resize(dimensions: TerminalDimensions): void;
  commit(size: number): void;
}

/** Application events emitted by the server and consumed by the browser. */
export interface ServerToClientEvents {
  data(data: string): void;
  login(): void;
  logout(): void;
  error(error: string | null): void;
}

/**
 * Maximum terminal input accepted in one Socket.IO event.
 *
 * This matches Socket.IO's existing default packet ceiling, preserving large
 * pastes that already worked while keeping direct/untyped handler calls bounded.
 * Encoded bytes are measured because JavaScript string length undercounts
 * multibyte terminal input.
 */
export const MAX_TERMINAL_INPUT_BYTES = 1_000_000;

/**
 * Maximum flow-control acknowledgement accepted from a client.
 *
 * This matches the server's high watermark, so one acknowledgement can drain a
 * fully paused window without letting an untyped client drive the counter far
 * below zero.
 */
export const MAX_FLOW_CONTROL_COMMIT = 2 * 1024 * 1024;

export interface TerminalInputPayload {
  input: string;
  binary: boolean;
}

/** Validate one client-originated terminal input event. */
export function parseInputPayload(
  input: unknown,
  binary?: unknown,
): TerminalInputPayload | undefined {
  if (
    typeof input !== 'string' ||
    new TextEncoder().encode(input).byteLength > MAX_TERMINAL_INPUT_BYTES ||
    (binary !== undefined && typeof binary !== 'boolean')
  ) {
    return undefined;
  }
  return { input, binary: binary ?? false };
}

/** Validate one client-originated flow-control acknowledgement. */
export function parseCommitPayload(payload: unknown): number | undefined {
  if (
    typeof payload !== 'number' ||
    !Number.isSafeInteger(payload) ||
    payload < 0 ||
    payload > MAX_FLOW_CONTROL_COMMIT
  ) {
    return undefined;
  }
  return payload;
}
