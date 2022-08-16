import type { confValue, Json } from './options/types';

export type XTerm = {
  cols?: number;
  rows?: number;
  fontSize: number;
} & Record<string, confValue | Json>;

export interface Options {
  xterm: XTerm;
  wettyFitTerminal: boolean;
  wettyVoid: number;
  [s: string]: confValue | Json;
}
