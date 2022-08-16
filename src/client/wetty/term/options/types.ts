export type confValue = boolean | string | number | Array<string>;

export interface OptionSchema {
  type: string;
  name: string;
  description: string;
  path: Array<string>;
  float?: boolean;
  min?: number;
  max?: number;
  enum?: Array<string>;
  nullable?: boolean;
  json?: boolean;
}

export interface Option extends OptionSchema {
  el: HTMLElement;
  get: () => any;
  set: (arg0: any) => void;
}

export interface Json {
  [key: string]: confValue | Json;
}
