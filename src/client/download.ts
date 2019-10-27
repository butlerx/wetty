import * as fileType from 'file-type';
import Toastify from 'toastify-js';

export const FILE_BEGIN = '\u001b[5i';
export const FILE_END = '\u001b[4i';
export let fileBuffer = [];

export function onCompleteFile() {
  let bufferCharacters = fileBuffer.join('');
  bufferCharacters = bufferCharacters.substring(
    bufferCharacters.lastIndexOf(FILE_BEGIN) + FILE_BEGIN.length,
    bufferCharacters.lastIndexOf(FILE_END)
  );

  // Try to decode it as base64, if it fails we assume it's not base64
  try {
    bufferCharacters = window.atob(bufferCharacters);
  } catch (err) {
    // Assuming it's not base64...
  }

  const bytes = new Uint8Array(bufferCharacters.length);
  for (let i = 0; i < bufferCharacters.length; i += 1) {
    bytes[i] = bufferCharacters.charCodeAt(i);
  }

  let mimeType = 'application/octet-stream';
  let fileExt = '';
  const typeData = fileType(bytes);
  if (typeData) {
    mimeType = typeData.mime;
    fileExt = typeData.ext;
  }
  const fileName = `file-${new Date()
    .toISOString()
    .split('.')[0]
    .replace(/-/g, '')
    .replace('T', '')
    .replace(/:/g, '')}${fileExt ? `.${fileExt}` : ''}`;

  const blob = new Blob([new Uint8Array(bytes.buffer)], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);

  fileBuffer = [];

  Toastify({
    text: `Download ready: <a href="${blobUrl}" target="_blank" download="${fileName}">${fileName}</a>`,
    duration: 10000,
    newWindow: true,
    gravity: 'bottom',
    position: 'right',
    backgroundColor: '#fff',
    stopOnFocus: true,
  }).showToast();
}
