import 'mocha';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect } from 'chai';
import type { Config, Server, SSH, SSL } from './server.js';

interface PublicTypes {
  config: Config;
  server: Server;
  ssh: SSH;
  ssl: SSL;
}

function acceptsPublicTypes(_types: PublicTypes): void {}

function inspectPublicFacade() {
  const facadeModule = pathToFileURL(resolve('src/server.ts')).href;
  const loggerModule = pathToFileURL(
    resolve('src/server/observability/logger.ts'),
  ).href;
  return spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      `
        const facade = await import(${JSON.stringify(facadeModule)});
        const { logger } = await import(${JSON.stringify(loggerModule)});
        console.log(JSON.stringify({
          exports: Object.keys(facade).sort(),
          loggerIdentity: facade.getLogger() === logger(),
        }));
      `,
    ],
    { encoding: 'utf8', timeout: 5000 },
  );
}

describe('public server facade', () => {
  it('preserves the runtime exports and getLogger behavior', () => {
    const result = inspectPublicFacade();

    expect(result.error).to.equal(undefined);
    expect(result.status).to.equal(0);
    expect(JSON.parse(result.stdout) as unknown).to.deep.equal({
      exports: ['decorateServerWithSsh', 'getLogger', 'start'],
      loggerIdentity: true,
    });
  });

  it('preserves the public type exports at compile time', () => {
    expect(acceptsPublicTypes).to.be.a('function');
  });
});
