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

  return [
    ...(pass ? ['sshpass', '-p', pass] : []),
    'ssh',
    '-t',
    ...(config ? ['-F', config] : []),
    ...(port ? ['-p', port] : []),
    ...(key ? ['-i', key] : []),
    ...(auth !== 'none' ? ['-o', `PreferredAuthentications=${auth}`] : []),
    '-o',
    `UserKnownHostsFile=${knownHosts}`,
    '-o',
    `StrictHostKeyChecking=${hostChecking}`,
    '-o',
    'EscapeChar=none',
    '--',
    host,
    ...(cmd ? [cmd] : []),
  ];
}

function quoteShellArgument(argument: string): string {
  return `'${argument.replaceAll("'", "'\\''")}'`;
}

function parseCommand(command: string, path?: string): string {
  if (command === 'login' && path === undefined) return '';
  if (path === undefined) return command;

  const script = `cd ${quoteShellArgument(path)};${command === 'login' ? '$SHELL' : command}`;
  // SSH's remote shell parses this once before $SHELL parses the script.
  return `$SHELL -c ${quoteShellArgument(script)}`;
}
