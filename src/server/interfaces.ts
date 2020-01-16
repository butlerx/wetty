export interface SSH {
  user: string;
  askuser: boolean;
  host: string;
  auth: string;
  port: number;
  pass?: string;
  key?: string;
}

export interface SSL {
  key: string;
  cert: string;
}

export interface SSLBuffer {
  key?: Buffer;
  cert?: Buffer;
}

export interface Server {
  port: number;
  host: string;
  title: string;
  base: string;
  bypasshelmet: boolean;
}
