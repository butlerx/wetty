import isUndefined from 'lodash/isUndefined.js';

const getRemoteAddress = (remoteAddress: string): string =>
  isUndefined(remoteAddress.split(':')[3])
    ? 'localhost'
    : remoteAddress.split(':')[3];

export function loginOptions(command: string, remoteAddress: string): string[] {
  return command === 'login'
    ? [command, '-h', getRemoteAddress(remoteAddress)]
    : [command];
}
