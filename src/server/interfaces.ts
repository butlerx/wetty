export interface SSH {
  user: string;
  host: string;
  auth: string;
  port: number;
  pass?: string;
  key?: string;
}

export interface SSL {
  key?: string;
  cert?: string;
}

export interface SSLBuffer {
  key?: Buffer;
  cert?: Buffer;
}

export interface Server {
  port: number;
  host: string;
  base: string;
  bypasshelmet: boolean;
}
