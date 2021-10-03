import Toastify from 'toastify-js';
import fileType from 'file-type';

const DEFAULT_FILE_BEGIN = '\u001b[5i';
const DEFAULT_FILE_END = '\u001b[4i';

type OnCompleteFile = (bufferCharacters: string) => void;

function onCompleteFile(bufferCharacters: string): void {
  let fileCharacters = bufferCharacters;
  // Try to decode it as base64, if it fails we assume it's not base64
  try {
    fileCharacters = window.atob(fileCharacters);
  } catch (err) {
    // Assuming it's not base64...
  }

  const bytes = new Uint8Array(fileCharacters.length);
  for (let i = 0; i < fileCharacters.length; i += 1) {
    bytes[i] = fileCharacters.charCodeAt(i);
  }

  let mimeType = 'application/octet-stream';
  let fileExt = '';
  const typeData = fileType(bytes);
  if (typeData) {
    mimeType = typeData.mime;
    fileExt = typeData.ext;
  }
  // Check if the buffer is ASCII
  // Ref: https://stackoverflow.com/a/14313213
  // eslint-disable-next-line no-control-regex
  else if (/^[\x00-\xFF]*$/.test(fileCharacters)) {
    mimeType = 'text/plain';
    fileExt = 'txt';
  }
  const fileName = `file-${new Date()
    .toISOString()
    .split('.')[0]
    .replace(/-/g, '')
    .replace('T', '')
    .replace(/:/g, '')}${fileExt ? `.${fileExt}` : ''}`;

  const blob = new Blob([new Uint8Array(bytes.buffer)], {
    type: mimeType,
  });
  const blobUrl = URL.createObjectURL(blob);

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

export class FileDownloader {
  fileBuffer: string[];
  fileBegin: string;
  fileEnd: string;
  partialFileBegin: string;
  onCompleteFileCallback: OnCompleteFile;

  constructor(
    onCompleteFileCallback: OnCompleteFile = onCompleteFile,
    fileBegin: string = DEFAULT_FILE_BEGIN,
    fileEnd: string = DEFAULT_FILE_END,
  ) {
    this.fileBuffer = [];
    this.fileBegin = fileBegin;
    this.fileEnd = fileEnd;
    this.partialFileBegin = '';
    this.onCompleteFileCallback = onCompleteFileCallback;
  }

  bufferCharacter(character: string): string {
    // If we are not currently buffering a file.
    if (this.fileBuffer.length === 0) {
      // If we are not currently expecting the rest of the fileBegin sequences.
      if (this.partialFileBegin.length === 0) {
        // If the character is the first character of fileBegin we know to start
        // expecting the rest of the fileBegin sequence.
        if (character === this.fileBegin[0]) {
          this.partialFileBegin = character;
          return '';
        }
        // Otherwise, we just return the character for printing to the terminal.

        return character;
      }
      // We're currently in the state of buffering a beginner marker...

      const nextExpectedCharacter =
        this.fileBegin[this.partialFileBegin.length];
      // If the next character *is* the next character in the fileBegin sequence.
      if (character === nextExpectedCharacter) {
        this.partialFileBegin += character;
        // Do we now have the complete fileBegin sequence.
        if (this.partialFileBegin === this.fileBegin) {
          this.partialFileBegin = '';
          this.fileBuffer = this.fileBuffer.concat(this.fileBegin.split(''));
          return '';
        }
        // Otherwise, we just wait until the next character.

        return '';
      }
      // If the next expected character wasn't found for the fileBegin sequence,
      // we need to return all the data that was bufferd in the partialFileBegin
      // back to the terminal.

      const dataToReturn = this.partialFileBegin + character;
      this.partialFileBegin = '';
      return dataToReturn;
    }
    // If we are currently in the state of buffering a file.

    this.fileBuffer.push(character);
    // If we now have an entire fileEnd marker, we have a complete file!
    if (
      this.fileBuffer.length >= this.fileBegin.length + this.fileEnd.length &&
      this.fileBuffer.slice(-this.fileEnd.length).join('') === this.fileEnd
    ) {
      this.onCompleteFileCallback(
        this.fileBuffer
          .slice(
            this.fileBegin.length,
            this.fileBuffer.length - this.fileEnd.length,
          )
          .join(''),
      );
      this.fileBuffer = [];
    }

    return '';
  }

  buffer(data: string): string {
    // This is a optimization to quickly return if we know for
    // sure we don't need to loop over each character.
    if (
      this.fileBuffer.length === 0 &&
      this.partialFileBegin.length === 0 &&
      data.indexOf(this.fileBegin[0]) === -1
    ) {
      return data;
    }
    return data.split('').map(this.bufferCharacter.bind(this)).join('');
  }
}
