import { expect } from 'chai';
import 'mocha';

import { parseOsc777 } from './notifications';

describe('parseOsc777', () => {
  it('should parse title and body', () => {
    expect(parseOsc777('notify;Build;Done')).to.deep.equal({
      title: 'Build',
      body: 'Done',
    });
  });

  it('should keep semicolons in the body', () => {
    expect(
      parseOsc777('notify;Build;Build finished; tests passed'),
    ).to.deep.equal({
      title: 'Build',
      body: 'Build finished; tests passed',
    });
  });

  it('should fall back to a default title and an empty body', () => {
    expect(parseOsc777('notify')).to.deep.equal({
      title: 'Terminal',
      body: '',
    });
  });

  it('should ignore commands other than notify', () => {
    expect(parseOsc777('other;Title;Body')).to.be.undefined;
  });
});
