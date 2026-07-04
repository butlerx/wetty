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
    // Use defaults – binds to a random port via the Rust config.
    const handle = await start();
    expect(handle).to.exist;
    expect(handle.close).to.be.a('function');
    await handle.close();
  });

  it('decorateServerWithSsh() ignores the first (app) argument', async () => {
    // The _app argument is deprecated and ignored by the Rust backend.
    const handle = await decorateServerWithSsh(null);
    expect(handle).to.exist;
    expect(handle.close).to.be.a('function');
    await handle.close();
  });
});
