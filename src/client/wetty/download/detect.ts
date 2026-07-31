import { fileTypeFromBuffer } from 'file-type';
import Toastify from 'toastify-js';

export async function onCompleteFile(bufferCharacters: string): Promise<void> {
  let fileNameBase64;
  let fileCharacters = bufferCharacters;
  if (bufferCharacters.includes(':')) {
    [fileNameBase64, fileCharacters] = bufferCharacters.split(':');
  }
  try {
    fileCharacters = window.atob(fileCharacters);
  } catch {
    // Assuming it's not base64...
  }

  const bytes = new Uint8Array(fileCharacters.length);
  for (let i = 0; i < fileCharacters.length; i += 1) {
    bytes[i] = fileCharacters.charCodeAt(i);
  }

  await detectAndDownload(bytes, fileCharacters, fileNameBase64);
}

async function detectAndDownload(
  bytes: Uint8Array,
  fileCharacters: string,
  fileNameBase64: string | undefined,
): Promise<void> {
  let mimeType = 'application/octet-stream';
  let fileExt = '';
  const typeData = await fileTypeFromBuffer(bytes);
  if (typeData) {
    mimeType = typeData.mime;
    fileExt = typeData.ext;
  }
  // eslint-disable-next-line no-control-regex
  else if (/^[\x00-\xFF]*$/.test(fileCharacters)) {
    mimeType = 'text/plain';
    fileExt = 'txt';
  }
  let fileName;
  try {
    if (fileNameBase64 !== undefined) {
      fileName = window.atob(fileNameBase64);
    }
  } catch {
    // Filename wasn't base64-encoded so let's ignore it
  }

  fileName ??= `file-${new Date()
    .toISOString()
    .split('.')[0]
    .replace(/-/g, '')
    .replace('T', '')
    .replace(/:/g, '')}${fileExt ? `.${fileExt}` : ''}`;

  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: mimeType,
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.target = '_blank';
  link.download = fileName;
  link.textContent = fileName;

  const wrapper = document.createElement('span');
  wrapper.textContent = 'Download ready: ';
  wrapper.appendChild(link);

  Toastify({
    node: wrapper,
    duration: 10000,
    gravity: 'bottom',
    position: 'right',
    backgroundColor: '#fff',
    stopOnFocus: true,
  }).showToast();
}
