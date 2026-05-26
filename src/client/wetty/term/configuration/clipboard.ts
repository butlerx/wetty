/**
 Copy text selection to clipboard on double click or select
 @param text - the selected text to copy
 */
export function copySelected(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    // Clipboard API unavailable or permission denied — silently fail
  });
}

export function copyShortcut(e: KeyboardEvent): boolean {
  // Ctrl + Shift + C
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    const selection = document.getSelection()?.toString() ?? '';
    navigator.clipboard.writeText(selection).catch(() => {});
    return false;
  }
  return true;
}
