import { isUndefined } from 'lodash';

export default function parseCommand(command: string, path?: string): string {
  if (command === 'login' && isUndefined(path)) return '';
  return !isUndefined(path)
    ? `$SHELL -c "cd ${path};${command === 'login' ? '$SHELL' : command}"`
    : command;
}
