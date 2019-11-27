const DEFAULT_FILE_BEGIN = '\u001b[5i';
const DEFAULT_FILE_END = '\u001b[4i';

export class FileDownloader {
  constructor(
    onCompleteFileCallback: (file: string) => any,
    fileBegin: string = DEFAULT_FILE_BEGIN,
    fileEnd: string = DEFAULT_FILE_END
  ) {
    this.fileBuffer = [];
    this.onCompleteFileCallback = onCompleteFileCallback;
    this.fileBegin = fileBegin;
    this.fileEnd = fileEnd;
    this.partialFileBegin = '';
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

      const nextExpectedCharacter = this.fileBegin[
        this.partialFileBegin.length
      ];
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
      this.onCompleteFile(
        this.fileBuffer
          .slice(
            this.fileBegin.length,
            this.fileBuffer.length - this.fileEnd.length
          )
          .join('')
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
    let newData = '';
    for (let i = 0; i < data.length; i += 1) {
      newData += this.bufferCharacter(data[i]);
    }
    return newData;
  }

  onCompleteFile(bufferCharacters: string) {
    this.onCompleteFileCallback(bufferCharacters);
  }
}
