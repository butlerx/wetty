import 'mocha';
import { expect } from 'chai';
import { positiveIntOr } from './defaults';

describe('positiveIntOr should never yield a value socket.io cannot use', () => {
  it('should parse a numeric string', () => {
    expect(positiveIntOr('25000', 3000)).to.equal(25000);
  });

  it('should pass a number through', () => {
    expect(positiveIntOr(25000, 3000)).to.equal(25000);
  });

  it('should fall back when undefined', () => {
    expect(positiveIntOr(undefined, 3000)).to.equal(3000);
  });

  it('should fall back on an empty string', () => {
    expect(positiveIntOr('', 3000)).to.equal(3000);
  });

  it('should fall back on a non numeric string', () => {
    expect(positiveIntOr('abc', 3000)).to.equal(3000);
  });

  it('should fall back on NaN', () => {
    expect(positiveIntOr(NaN, 3000)).to.equal(3000);
  });

  it('should fall back on zero', () => {
    expect(positiveIntOr(0, 3000)).to.equal(3000);
  });

  it('should fall back on a negative value', () => {
    expect(positiveIntOr(-1, 3000)).to.equal(3000);
  });

  it('should fall back on infinity', () => {
    expect(positiveIntOr(Infinity, 3000)).to.equal(3000);
  });
});
