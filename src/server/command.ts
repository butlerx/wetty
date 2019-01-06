import { Socket } from 'socket.io';
import { SSH } from './interfaces';

const localhost = (host: string): boolean =>
  process.getuid() === 0 &&
  (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1');

export default (
  { request: { headers }, client: { conn } }: Socket,
  { user, host, port, auth }: SSH
): { args: string[]; user: boolean } => ({
  args: localhost(host)
    ? ['login', '-h', conn.remoteAddress.split(':')[3]]
    : [
        'ssh',
        address(headers.referer, user, host),
        '-p',
        `${port}`,
        '-o',
        `PreferredAuthentications=${auth}`,
      ],
  user:
    localhost(host) ||
    user !== '' ||
    user.includes('@') ||
    address(headers.referer, user, host).includes('@'),
});

function address(referer: string, user: string, host: string): string {
  const match = referer.match('.+/ssh/([^/]+)$');
  const fallback = user ? `${user}@${host}` : host;
  return match ? `${match[1]}@${host}` : fallback;
}
