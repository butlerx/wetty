// NOTE text selection on double click or select
export function copySelected(text: string): boolean {
  if (window.clipboardData && window.clipboardData.setData) {
    window.clipboardData.setData('Text', text);
    return true;
  }
  if (
    document.queryCommandSupported &&
    document.queryCommandSupported('copy')
  ) {
    const textarea = document.createElement('textarea');
    textarea.textContent = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (ex) {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
  return false;
}

export function copyShortcut(e: KeyboardEvent): boolean {
  // Ctrl + Shift + C
  if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
    e.preventDefault();
    document.execCommand('copy');
    return false;
  }
  return true;
}
