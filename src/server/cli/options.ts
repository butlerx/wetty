export interface Options {
  sshhost: string;
  sshport: number;
  sshuser: string;
  sshauth: string;
  sshkey?: string;
  sshpass?: string;
  sslkey?: string;
  sslcert?: string;
  base: string;
  host: string;
  port: number;
  title: string;
  command?: string;
  bypasshelmet?: boolean;
}

export interface CLI extends Options {
  help: boolean;
}
