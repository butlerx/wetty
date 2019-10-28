import { isUndefined } from 'lodash';

const getRemoteAddress = (remoteAddress: string): string =>
  isUndefined(remoteAddress.split(':')[3])
    ? 'localhost'
    : remoteAddress.split(':')[3];

export default function loginOptions(
  command: string,
  remoteAddress: string
): string[] {
  return command === 'login'
    ? [command, '-h', getRemoteAddress(remoteAddress)]
    : [command];
}
