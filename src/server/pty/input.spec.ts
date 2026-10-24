import 'mocha';
import { expect } from 'chai';
import { writePtyInput } from './input';

describe('PTY input', () => {
  it('preserves text input as a string', () => {
    let written: string | Buffer | undefined;
    writePtyInput(
      {
        write(data: string | Buffer) {
          written = data;
        },
      },
      'keyboard input',
    );

    expect(written).to.equal('keyboard input');
  });

  it('preserves binary xterm input bytes', () => {
    let written: string | Buffer | undefined;
    const mouseReport = '\x1b[M\x01\x80\xff';
    writePtyInput(
      {
        write(data: string | Buffer) {
          written = data;
        },
      },
      mouseReport,
      true,
    );

    expect(written).to.be.instanceOf(Buffer);
    expect(written instanceof Buffer ? [...written] : []).to.deep.equal([
      0x1b, 0x5b, 0x4d, 0x01, 0x80, 0xff,
    ]);
  });
});
