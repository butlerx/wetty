import isUndefined from 'lodash/isUndefined.js';
import { logger } from '../../shared/logger.js';

export function sshOptions(
  {
    pass,
    path,
    command,
    host,
    port,
    auth,
    knownHosts,
    config,
  }: Record<string, string>,
  key?: string,
): string[] {
  const cmd = parseCommand(command, path);
  const hostChecking = knownHosts !== '/dev/null' ? 'yes' : 'no';
  logger().info(`Authentication Type: ${auth}`);
  let sshRemoteOptsBase = ['ssh', host, '-t'];
  if (!isUndefined(config) && config !== '') {
    sshRemoteOptsBase = sshRemoteOptsBase.concat(['-F', config]);
  }
  sshRemoteOptsBase = sshRemoteOptsBase.concat([
    '-p',
    port,
    '-o',
    `PreferredAuthentications=${auth}`,
    '-o',
    `UserKnownHostsFile=${knownHosts}`,
    '-o',
    `StrictHostKeyChecking=${hostChecking}`,
  ]);
  if (!isUndefined(key)) {
    return sshRemoteOptsBase.concat(['-i', key, cmd]);
  }
  if (pass !== '') {
    return ['sshpass', '-p', pass].concat(sshRemoteOptsBase, [cmd]);
  }
  if (auth === 'none') {
    sshRemoteOptsBase.splice(sshRemoteOptsBase.indexOf('-o'), 2);
  }

  return cmd === '' ? sshRemoteOptsBase : sshRemoteOptsBase.concat([cmd]);
}

function parseCommand(command: string, path?: string): string {
  if (command === 'login' && isUndefined(path)) return '';
  return !isUndefined(path)
    ? `$SHELL -c "cd ${path};${command === 'login' ? '$SHELL' : command}"`
    : command;
}
