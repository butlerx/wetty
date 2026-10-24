import { expect } from 'chai';
import 'mocha';

import {
  clientToServerPayloads,
  serverToClientPayloads,
} from './fixtures/socket-events';
import {
  MAX_FLOW_CONTROL_COMMIT,
  MAX_TERMINAL_INPUT_BYTES,
  parseCommitPayload,
  parseInputPayload,
  type ServerToClientEvents,
} from './socket-events';

describe('Socket.IO protocol compatibility', () => {
  it('locks the client-to-server event names and representative payloads', () => {
    expect(Object.keys(clientToServerPayloads)).to.deep.equal([
      'input',
      'resize',
      'commit',
    ]);
    expect(clientToServerPayloads).to.deep.equal({
      input: ['whoami', true],
      resize: [{ cols: 80, rows: 24 }],
      commit: [262144],
    });
  });

  it('locks the server-to-client event names and representative payloads', () => {
    expect(Object.keys(serverToClientPayloads)).to.deep.equal([
      'data',
      'login',
      'logout',
      'error',
    ]);
    expect(serverToClientPayloads).to.deep.equal({
      data: ['terminal output'],
      login: [],
      logout: [],
      error: ['Terminal session failed'],
    });

    const nullableError: Parameters<ServerToClientEvents['error']> = [null];
    expect(nullableError).to.deep.equal([null]);
  });
});

describe('client payload decoders', () => {
  it('accepts current text and binary input payloads within the bound', () => {
    expect(parseInputPayload('whoami')).to.deep.equal({
      input: 'whoami',
      binary: false,
    });
    expect(parseInputPayload('\u0000', true)).to.deep.equal({
      input: '\u0000',
      binary: true,
    });
    const largePaste = 'x'.repeat(65_537);
    expect(parseInputPayload(largePaste, false)).to.deep.equal({
      input: largePaste,
      binary: false,
    });
    expect(
      parseInputPayload('x'.repeat(MAX_TERMINAL_INPUT_BYTES), false),
    ).to.deep.equal({
      input: 'x'.repeat(MAX_TERMINAL_INPUT_BYTES),
      binary: false,
    });
  });

  it('rejects non-string, oversized, and invalid binary input payloads', () => {
    for (const value of [undefined, null, 42, {}, ['whoami']]) {
      expect(parseInputPayload(value)).to.equal(undefined);
    }
    expect(
      parseInputPayload('x'.repeat(MAX_TERMINAL_INPUT_BYTES + 1)),
    ).to.equal(undefined);
    expect(parseInputPayload('whoami', 'true')).to.equal(undefined);
    expect(parseInputPayload('whoami', 1)).to.equal(undefined);
    expect(parseInputPayload('whoami', null)).to.equal(undefined);
  });

  it('accepts finite nonnegative commit payloads within the bound', () => {
    expect(parseCommitPayload(0)).to.equal(0);
    expect(parseCommitPayload(262144)).to.equal(262144);
    expect(parseCommitPayload(MAX_FLOW_CONTROL_COMMIT)).to.equal(
      MAX_FLOW_CONTROL_COMMIT,
    );
  });

  it('rejects missing, wrong-type, negative, nonfinite, and oversized commits', () => {
    for (const value of [
      undefined,
      null,
      '262144',
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      1.5,
      MAX_FLOW_CONTROL_COMMIT + 1,
    ]) {
      expect(parseCommitPayload(value)).to.equal(undefined);
    }
  });
});
