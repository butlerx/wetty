export function verifyPrompt(e: { returnValue: string }): string {
  e.returnValue = 'Are you sure?';
  return e.returnValue;
}
