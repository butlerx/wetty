import * as url from 'url';
import { Socket } from 'socket.io';
import { SSH } from './interfaces';

const localhost = (host: string): boolean =>
  process.getuid() === 0 &&
  (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1');

const urlArgs = (
  referer: string,
  def: { [s: string]: string }
): { [s: string]: string } =>
  Object.assign(def, url.parse(referer, true).query);

const getRemoteAddress = (remoteAddress: string): string =>
  remoteAddress.split(':')[3] === undefined
    ? 'localhost'
    : remoteAddress.split(':')[3];

export default (
  {
    request: {
      headers: { referer },
    },
    client: {
      conn: { remoteAddress },
    },
  }: Socket,
  { user, host, port, auth, pass, key }: SSH,
  command: string
): { args: string[]; user: boolean } => ({
  args: localhost(host)
    ? loginOptions(command, remoteAddress)
    : sshOptions(
        urlArgs(referer, {
          host: address(referer, user, host),
          port: `${port}`,
          pass,
          command,
          auth,
        }),
        key
      ),
  user:
    localhost(host) ||
    user !== '' ||
    user.includes('@') ||
    address(referer, user, host).includes('@'),
});

function parseCommand(command: string, path?: string): string {
  if (command === 'login' && path === undefined) return '';
  return path !== undefined
    ? `$SHELL -c "cd ${path};${command === 'login' ? '$SHELL' : command}"`
    : command;
}

function sshOptions(
  { pass, path, command, host, port, auth }: { [s: string]: string },
  key?: string
): string[] {
  const cmd = parseCommand(command, path);
  const sshRemoteOptsBase = [
    'ssh',
    host,
    '-t',
    '-p',
    port,
    '-o',
    `PreferredAuthentications=${auth}`,
  ];
  if (key) {
    return sshRemoteOptsBase.concat(['-i', key, cmd]);
  }
  if (pass) {
    return ['sshpass', '-p', pass].concat(sshRemoteOptsBase, [cmd]);
  }
  if (cmd === '') {
    return sshRemoteOptsBase;
  }
  return sshRemoteOptsBase.concat([cmd]);
}

function loginOptions(command: string, remoteAddress: string): string[] {
  return command === 'login'
    ? [command, '-h', getRemoteAddress(remoteAddress)]
    : [command];
}

function address(referer: string, user: string, host: string): string {
  const match = referer.match('.+/ssh/([^/]+)$');
  const fallback = user ? `${user}@${host}` : host;
  return match ? `${match[1]}@${host}` : fallback;
}
