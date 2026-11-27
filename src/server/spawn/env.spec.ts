import { expect } from 'chai';
import { envVersionOr, parseEnvVersion } from './env.js';

describe('parseEnvVersion', () => {
  it('reads the major version from GNU coreutils', () => {
    expect(parseEnvVersion('env (GNU coreutils) 9.4\nCopyright (C) 2023\n')).to.equal(9);
    expect(parseEnvVersion('env (GNU coreutils) 8.32\n')).to.equal(8);
  });

  it('treats uutils coreutils as supporting env -S', () => {
    expect(parseEnvVersion('env (uutils coreutils) 0.10.0\n')).to.equal(9);
  });

  it('returns undefined for unrecognised output instead of throwing', () => {
    expect(parseEnvVersion('env from somewhere else 1.0')).to.equal(undefined);
    expect(parseEnvVersion('')).to.equal(undefined);
  });
});

describe('envVersionOr', () => {
  it('resolves on this machine without throwing', async () => {
    const v = await envVersionOr(-1);
    expect(v).to.be.a('number');
  });
});
