import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import { sassPlugin } from 'esbuild-sass-plugin';

/** @typedef {'SIGINT' | 'SIGTERM'} WatchSignal */
/** @typedef {{type: 'exit', error: unknown} | {type: 'signal', signal: WatchSignal}} WatchOutcome */

/** @param {string} prog
 * @param {string[]} [args=[]]
 * @param {boolean} [detached=false]
 * @returns {{proc: import('node:child_process').ChildProcess, done: Promise<void>}}
 */
function spawnCommand(prog, args = [], detached = false) {
  const proc = spawn(prog, args, {
    cwd: import.meta.dirname,
    stdio: 'inherit',
    env: process.env,
    detached,
  });
  /** @type {Promise<void>} */
  const done = new Promise((resolve, reject) => {
    proc.once('error', reject);
    proc.once('exit', (ret, sig) => {
      if (ret === 0) {
        resolve();
        return;
      }
      const reason =
        ret === null ? `signal ${String(sig)}` : `exit code ${String(ret)}`;
      reject(new Error(`${prog} failed with ${reason}`));
    });
  });
  return { proc, done };
}

/** @param {string} prog
 * @param {string[]} [args=[]]
 * @returns {Promise<void>}
 */
export function cmd(prog, args = []) {
  return spawnCommand(prog, args).done;
}

/** @type import('esbuild').Plugin */
const typechecker = {
  name: 'typechecker',
  setup(build) {
    build.onStart(async () => {
      await cmd('pnpm', ['tsc', '-p', 'tsconfig.browser.json']);
      return {};
    });
  },
};

/** @param {boolean} watching
 * @returns {Promise<import('esbuild').BuildContext | undefined>}
 */
async function buildClient(watching) {
  /** @type {esbuild.BuildOptions} */
  const esConf = {
    entryPoints: {
      wetty: 'src/client/wetty.ts',
      dev: 'src/client/dev.ts',
      'xterm_config/functionality': 'src/client/config-editor/index.ts',
    },
    outdir: 'build/client',
    bundle: true,
    platform: 'browser',
    format: 'esm',
    minify: !watching,
    sourcemap: !watching,
    plugins: [
      typechecker,
      sassPlugin({
        embedded: true,
        loadPaths: ['node_modules'],
        style: watching ? 'expanded' : 'compressed',
      }),
      copy({
        assets: [
          { from: './src/assets/xterm_config/*', to: 'xterm_config' },
          { from: './src/assets/favicon.svg', to: 'favicon.svg' },
          { from: './src/assets/favicon-alert.svg', to: 'favicon-alert.svg' },
          { from: './src/assets/manifest.json', to: 'manifest.json' },
          { from: './src/assets/sw.js', to: '../sw.js' },
          { from: './src/assets/wetty.svg', to: 'wetty.svg' },
        ],
        watch: watching,
      }),
    ],
    logLevel: 'info',
  };

  if (watching) {
    const buildCtx = await esbuild.context(esConf);
    await buildCtx.watch();
    return buildCtx;
  }
  await esbuild.build(esConf);
  return undefined;
}

async function buildServer() {
  await cmd('pnpm', [
    'tsc',
    '-p',
    'tsconfig.node.json',
    '--incremental',
    'false',
  ]);
}

/** @param {import('node:child_process').ChildProcess} proc
 * @param {NodeJS.Signals} signal
 */
function signalWatcher(proc, signal) {
  if (proc.exitCode !== null || proc.signalCode !== null) return;
  if (process.platform !== 'win32' && proc.pid !== undefined) {
    try {
      process.kill(-proc.pid, signal);
      return;
    } catch {
      // Fall back to signaling the direct child if the group is already gone.
    }
  }
  proc.kill(signal);
}

/** @param {ReturnType<typeof spawnCommand>} watcher */
async function stopWatcher(watcher) {
  signalWatcher(watcher.proc, 'SIGTERM');
  const stopped = await Promise.race([
    watcher.done.then(
      () => true,
      () => true,
    ),
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 2000);
      timer.unref();
    }),
  ]);
  if (!stopped) {
    signalWatcher(watcher.proc, 'SIGKILL');
    await watcher.done.catch(() => undefined);
  }
}

async function watchBuild() {
  const clientContext = await buildClient(true);
  const serverWatcher = spawnCommand(
    'pnpm',
    ['tsc', '-p', 'tsconfig.node.json', '--watch', '--preserveWatchOutput'],
    process.platform !== 'win32',
  );
  /** @type {(signal: WatchSignal) => void} */
  let resolveSignal = () => undefined;
  /** @type {Promise<WatchSignal>} */
  const signalReceived = new Promise((resolve) => {
    resolveSignal = resolve;
  });
  const onSigint = () => resolveSignal('SIGINT');
  const onSigterm = () => resolveSignal('SIGTERM');
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  try {
    /** @type {Promise<WatchOutcome>} */
    const watcherFinished = serverWatcher.done.then(
      () => ({ type: 'exit', error: new Error('TypeScript watcher exited') }),
      (error) => ({ type: 'exit', error }),
    );
    /** @type {Promise<WatchOutcome>} */
    const signalFinished = signalReceived.then((signal) => ({
      type: 'signal',
      signal,
    }));
    const outcome = await Promise.race([watcherFinished, signalFinished]);
    if (outcome.type === 'exit') throw outcome.error;
    process.exitCode = outcome.signal === 'SIGINT' ? 130 : 143;
  } finally {
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
    await Promise.allSettled([
      stopWatcher(serverWatcher),
      clientContext?.dispose() ?? Promise.resolve(),
    ]);
  }
}

export async function main() {
  const watching = process.argv.includes('--watch');
  if (watching) {
    await watchBuild();
    return;
  }
  await rm(new URL('./build', import.meta.url), {
    recursive: true,
    force: true,
  });
  await buildClient(false);
  await buildServer();
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
