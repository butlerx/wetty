import 'mocha';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect } from 'chai';
import { ESLint } from 'eslint';

const buildModule = pathToFileURL(resolve('build.js')).href;
const editorOutput = resolve('build/client/xterm_config');
const editorSource = resolve('src/client/config-editor');

function runBuild() {
  return spawnSync(process.execPath, ['build.js'], {
    encoding: 'utf8',
    timeout: 60_000,
  });
}

function waitForWatchReady(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolveReady, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error(`Watch build did not become ready:\n${output}`));
    }, 30_000);
    function inspect(chunk: Buffer): void {
      output += chunk.toString();
      if (
        output.includes('build finished') &&
        output.includes('Watching for file changes')
      ) {
        clearTimeout(timeout);
        resolveReady();
      }
    }
    child.stdout?.on('data', inspect);
    child.stderr?.on('data', inspect);
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Watch build exited before ready: ${String(code)} ${String(signal)}`,
        ),
      );
    });
  });
}

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

  it('creates the same single-bundle editor inventory across clean builds', () => {
    mkdirSync(editorOutput, { recursive: true });
    writeFileSync(resolve(editorOutput, 'stale.js'), 'stale');
    const expectedInventory = [
      'functionality.js',
      'functionality.js.map',
      'index.html',
      'style.css',
    ];

    const firstResult = runBuild();
    expect(firstResult.error).to.equal(undefined);
    expect(
      firstResult.status,
      `${firstResult.stdout}\n${firstResult.stderr}`,
    ).to.equal(0);
    expect(readdirSync(editorOutput).sort()).to.deep.equal(expectedInventory);

    const secondResult = runBuild();
    expect(secondResult.error).to.equal(undefined);
    expect(
      secondResult.status,
      `${secondResult.stdout}\n${secondResult.stderr}`,
    ).to.equal(0);
    expect(readdirSync(editorOutput).sort()).to.deep.equal(expectedInventory);
    expect(existsSync(resolve('build/server.js'))).to.equal(true);
  }).timeout(120_000);

  it('packs a consumable public API, CLI, and browser assets', () => {
    const directory = mkdtempSync(resolve('.wetty-package-'));
    try {
      const packed = spawnSync(
        'pnpm',
        ['pack', '--pack-destination', directory],
        { encoding: 'utf8', timeout: 60_000 },
      );
      expect(packed.error).to.equal(undefined);
      expect(packed.status, `${packed.stdout}\n${packed.stderr}`).to.equal(0);
      const archive = readdirSync(directory).find((file) =>
        file.endsWith('.tgz'),
      );
      if (archive === undefined) {
        throw new Error('Package archive was not made');
      }
      const extracted = spawnSync(
        'tar',
        ['-xzf', resolve(directory, archive), '-C', directory],
        { encoding: 'utf8', timeout: 30_000 },
      );
      expect(extracted.status, extracted.stderr).to.equal(0);
      const packageRoot = resolve(directory, 'package');
      const api = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `const api = await import(${JSON.stringify(
            pathToFileURL(resolve(packageRoot, 'build/server.js')).href,
          )}); console.log(Object.keys(api).sort().join(','));`,
        ],
        { encoding: 'utf8', timeout: 30_000 },
      );
      expect(api.status, api.stderr).to.equal(0);
      expect(api.stdout.trim()).to.equal(
        'decorateServerWithSsh,getLogger,start',
      );
      const cli = spawnSync(
        process.execPath,
        [resolve(packageRoot, 'build/main.js'), '--help'],
        { encoding: 'utf8', timeout: 30_000 },
      );
      expect(cli.status, cli.stderr).to.equal(0);
      expect(cli.stdout).to.include('--allowed-origin');
      for (const asset of [
        'build/client/xterm_config/index.html',
        'build/client/xterm_config/style.css',
        'build/client/xterm_config/functionality.js',
        'build/client/favicon.svg',
        'build/client/favicon-alert.svg',
        'build/sw.js',
      ]) {
        expect(existsSync(resolve(packageRoot, asset)), asset).to.equal(true);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }).timeout(120_000);

  for (const [terminationSignal, expectedCode] of [
    ['SIGTERM', 143],
    ['SIGINT', 130],
  ] as const) {
    it(`shuts down watch subprocesses on ${terminationSignal}`, async () => {
      const child = spawn(process.execPath, ['build.js', '--watch'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      try {
        await waitForWatchReady(child);
        child.kill(terminationSignal);
        const [code, signal] = (await once(child, 'exit')) as [
          number | null,
          NodeJS.Signals | null,
        ];
        expect(signal).to.equal(null);
        expect(code).to.equal(expectedCode);
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }
      }
    }).timeout(40_000);
  }

  it('keeps typed editor and service worker sources under ESLint', async () => {
    const eslint = new ESLint();

    expect(
      readdirSync(editorSource).filter((file) => file.endsWith('.js')),
    ).to.deep.equal([]);
    expect(
      await eslint.isPathIgnored('src/client/config-editor/functionality.ts'),
    ).to.equal(false);
    expect(
      await eslint.isPathIgnored('src/client/config-editor/messages.ts'),
    ).to.equal(false);
    expect(await eslint.isPathIgnored('src/assets/sw.js')).to.equal(false);
    expect(
      await eslint.isPathIgnored('src/assets/xterm_config/index.html'),
    ).to.equal(true);
  });
});
