import 'mocha';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect } from 'chai';
import { ESLint } from 'eslint';

const buildModule = pathToFileURL(resolve('build.js')).href;
const editorOutput = resolve('build/client/xterm_config');

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

  it('creates the complete editor inventory from a clean build', () => {
    mkdirSync(editorOutput, { recursive: true });
    writeFileSync(resolve(editorOutput, 'stale.js'), 'stale');

    const result = spawnSync(process.execPath, ['build.js'], {
      encoding: 'utf8',
      timeout: 60_000,
    });

    expect(result.error).to.equal(undefined);
    expect(result.status, `${result.stdout}\n${result.stderr}`).to.equal(0);
    expect(readdirSync(editorOutput).sort()).to.deep.equal([
      'functionality.js',
      'index.html',
      'style.css',
      'xterm_advanced_options.js',
      'xterm_color_theme.js',
      'xterm_defaults.js',
      'xterm_general_options.js',
    ]);
    expect(existsSync(resolve('build/server.js'))).to.equal(true);
  }).timeout(60_000);

  it('keeps executable editor and service worker sources under ESLint', async () => {
    const eslint = new ESLint();

    expect(
      await eslint.isPathIgnored('src/client/config-editor/functionality.js'),
    ).to.equal(false);
    expect(await eslint.isPathIgnored('src/assets/sw.js')).to.equal(false);
    expect(
      await eslint.isPathIgnored('src/assets/xterm_config/index.html'),
    ).to.equal(true);
  });
});
