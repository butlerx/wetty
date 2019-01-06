export interface SSH {
  user: string;
  host: string;
  auth: string;
  port: number;
}

export interface SSL {
  key?: string;
  cert?: string;
}

export interface SSLBuffer {
  key?: Buffer;
  cert?: Buffer;
}
