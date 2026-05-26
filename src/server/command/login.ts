function getRemoteAddress(remoteAddress: string): string {
  const parts = remoteAddress.split(':');
  return parts.length > 3 ? parts[3] : 'localhost';
}

export function loginOptions(command: string, remoteAddress: string): string[] {
  return command === 'login'
    ? [command, '-h', getRemoteAddress(remoteAddress)]
    : [command];
}
