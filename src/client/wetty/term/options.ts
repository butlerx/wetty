export type XTerm = {
  cols?: number;
  rows?: number;
  fontSize: number;
} & Record<string, unknown>;

export interface Options {
  xterm: XTerm;
  wettyFitTerminal: boolean;
  wettyVoid: number;
}
