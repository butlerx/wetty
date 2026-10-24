import 'mocha';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect } from 'chai';

const buildModule = pathToFileURL(resolve('build.js')).href;

function runCommand(body: string) {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import { cmd } from ${JSON.stringify(buildModule)}; ${body}`,
    ],
    {
      encoding: 'utf8',
      timeout: 5000,
    },
  );
}

describe('build process execution', () => {
  it('resolves when the child process exits successfully', () => {
    const result = runCommand(`
      const done = cmd(process.execPath, ['-e', 'process.exit(0)']);
      await done;
      process.exit(0);
    `);

    expect(result.error).to.equal(undefined);
    expect(result.status).to.equal(0);
  });

  it('rejects when the child process exits unsuccessfully', () => {
    const result = runCommand(`
      const done = cmd(process.execPath, ['-e', 'process.exit(7)']);
      try {
        await done;
        process.exit(9);
      } catch (error) {
        console.error(error.message);
        process.exit(0);
      }
    `);

    expect(result.error).to.equal(undefined);
    expect(result.status).to.equal(0);
    expect(result.stderr).to.include('exit code 7');
  });

  it('rejects when the child process cannot start', () => {
    const result = runCommand(`
      const done = cmd('wetty-missing-executable');
      try {
        await done;
        process.exit(9);
      } catch (error) {
        console.error(error.code);
        process.exit(0);
      }
    `);

    expect(result.error).to.equal(undefined);
    expect(result.status).to.equal(0);
    expect(result.stderr).to.include('ENOENT');
  });
});
