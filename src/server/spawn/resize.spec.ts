import 'mocha';
import { expect } from 'chai';
import { parseDimensions } from './resize';

describe('Client supplied terminal dimensions should be validated before resizing the PTY', () => {
  it('should accept a well formed payload', () => {
    expect(parseDimensions({ cols: 80, rows: 30 })).to.deep.equal({
      cols: 80,
      rows: 30,
    });
  });

  it('should ignore extra properties', () => {
    expect(
      parseDimensions({ cols: 120, rows: 40, extra: 'ignored' }),
    ).to.deep.equal({ cols: 120, rows: 40 });
  });

  it('should reject payloads that are not objects', () => {
    expect(parseDimensions(undefined)).to.equal(undefined);
    expect(parseDimensions(null)).to.equal(undefined);
    expect(parseDimensions('80x30')).to.equal(undefined);
    expect(parseDimensions(42)).to.equal(undefined);
  });

  it('should reject missing dimensions', () => {
    expect(parseDimensions({})).to.equal(undefined);
    expect(parseDimensions({ cols: 80 })).to.equal(undefined);
    expect(parseDimensions({ rows: 30 })).to.equal(undefined);
  });

  it('should reject dimensions node-pty would refuse', () => {
    expect(parseDimensions({ cols: 0, rows: 30 })).to.equal(undefined);
    expect(parseDimensions({ cols: 80, rows: 0 })).to.equal(undefined);
    expect(parseDimensions({ cols: -1, rows: 30 })).to.equal(undefined);
    expect(parseDimensions({ cols: 80, rows: -1 })).to.equal(undefined);
  });

  it('should reject non integer and non finite dimensions', () => {
    expect(parseDimensions({ cols: Number.NaN, rows: 30 })).to.equal(undefined);
    expect(
      parseDimensions({ cols: 80, rows: Number.POSITIVE_INFINITY }),
    ).to.equal(undefined);
    expect(parseDimensions({ cols: 80.5, rows: 30 })).to.equal(undefined);
    expect(parseDimensions({ cols: '80', rows: '30' })).to.equal(undefined);
  });

  it('should reject dimensions above the allowed maximum', () => {
    expect(parseDimensions({ cols: 10000, rows: 30 })).to.equal(undefined);
    expect(parseDimensions({ cols: 80, rows: 10000 })).to.equal(undefined);
    expect(parseDimensions({ cols: 9999, rows: 9999 })).to.deep.equal({
      cols: 9999,
      rows: 9999,
    });
  });
});
