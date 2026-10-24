import type { Options } from '../wetty/term/options';

export interface EditorLoadMessage {
  type: 'wetty:load';
  config: Options;
}

export interface EditorSaveMessage {
  type: 'wetty:save';
  config: Options;
}

export interface EditorCloseMessage {
  type: 'wetty:close';
}

export type EditorMessage = EditorSaveMessage | EditorCloseMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isOptions(value: unknown): value is Options {
  return (
    isRecord(value) &&
    isRecord(value.xterm) &&
    typeof value.wettyFitTerminal === 'boolean' &&
    typeof value.wettyVoid === 'number' &&
    Number.isFinite(value.wettyVoid)
  );
}

export function decodeEditorLoadMessage(
  value: unknown,
): EditorLoadMessage | null {
  if (
    !isRecord(value) ||
    value.type !== 'wetty:load' ||
    !isOptions(value.config)
  ) {
    return null;
  }
  return { type: 'wetty:load', config: value.config };
}

export function decodeEditorMessage(value: unknown): EditorMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'wetty:close') return { type: 'wetty:close' };
  if (value.type === 'wetty:save' && isOptions(value.config)) {
    return { type: 'wetty:save', config: value.config };
  }
  return null;
}
