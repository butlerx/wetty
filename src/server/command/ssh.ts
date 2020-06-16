import { isUndefined } from 'lodash';
import parseCommand from './parse';
import logger from '../utils/logger';

export default function sshOptions(
  { pass, path, command, host, port, auth, knownhosts }: { [s: string]: string },
  key?: string
): string[] {
  const cmd = parseCommand(command, path);
  const hostChecking = (knownhosts !== '/dev/null') ? 'yes' : 'no'
  const sshRemoteOptsBase = [
    'ssh',
    host,
    '-t',
    '-p',
    port,
    '-o',
    `PreferredAuthentications=${auth}`,
    '-o',
    `UserKnownHostsFile=${knownhosts}`,
    '-o', 
    `StrictHostKeyChecking=${hostChecking}`,
  ];
  logger.info(`Authentication Type: ${auth}`);
  if (!isUndefined(key)) {
    return sshRemoteOptsBase.concat(['-i', key, cmd]);
  }
  if (pass !== '') {
    return ['sshpass', '-p', pass].concat(sshRemoteOptsBase, [cmd]);
  }
  if (auth === 'none') {
    sshRemoteOptsBase.splice(sshRemoteOptsBase.indexOf('-o'), 2);
  }

  if (cmd === '') {
    return sshRemoteOptsBase;
  }
  return sshRemoteOptsBase.concat([cmd]);
}
