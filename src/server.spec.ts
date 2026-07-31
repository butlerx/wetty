/**
 * Smoke tests for the Rust-backed `src/server.ts` shim.
 *
 * These tests verify that:
 *  - The module exports the expected symbols.
 *  - `start()` returns a handle with a `close()` method.
 *  - `decorateServerWithSsh()` also returns a handle with `close()`.
 *  - `close()` shuts the server down without throwing.
 */

import { expect } from 'chai';
import { start, decorateServerWithSsh } from './server.js';

describe('server shim (Rust backend)', () => {
  it('start() resolves a ServerHandle with a close() method', async () => {
    const handle = await start();
    expect(handle).to.exist;
    expect(handle).to.have.property('close').that.is.a('function');
    handle.close();
  });

  it('decorateServerWithSsh() ignores the first (app) argument', async () => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const handle = await decorateServerWithSsh(null);
    expect(handle).to.exist;
    expect(handle).to.have.property('close').that.is.a('function');
    handle.close();
  });
});
