import { spawn } from 'node:child_process';
import * as esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import { sassPlugin } from 'esbuild-sass-plugin';

/** @param {string} prog
 * @param {string[]} [args=[]]
 * @returns {[ChildProcess, Promise<{ret: number, sig: NodeJS.Signals}>]}
 */
function cmd(prog, args = []) {
  const proc = spawn(prog, args, {
    cwd: import.meta.dirname,
    stdio: 'inherit',
    env: process.env,
  });
  const done = new Promise((resolve, _reject) => {
    proc.addListener('exit', (ret, sig) => {
      resolve({ ret, sig });
    });
  });
  return [proc, done];
}

/** Build the Rust native addon (wetty-server) and copy the .node file.
 * @returns {Promise<void>}
 */
async function buildRust() {
  const profile = process.env.NODE_ENV === 'production' ? 'release' : 'dev';
  const cargoArgs =
    profile === 'release'
      ? ['build', '--release', '--features', 'node-binding', '-p', 'wetty-server']
      : ['build', '--features', 'node-binding', '-p', 'wetty-server'];

  const [, cargoDone] = cmd('cargo', cargoArgs);
  const { ret } = await cargoDone;
  if (ret !== 0) {
    throw new Error(`cargo build exited with code ${ret}`);
  }

  // Copy the built .node addon into build/ using the shared helper script.
  const profileDir = profile === 'release' ? 'release' : 'debug';
  const [, cpDone] = cmd('sh', ['scripts/copy-addon.sh', profileDir]);
  const { ret: cpRet } = await cpDone;
  if (cpRet !== 0) {
    throw new Error('copy-addon.sh failed');
  }
}

/** @type import('esbuild').Plugin */
const typechecker = {
  name: 'typechecker',
  setup(build) {
    build.onStart(async () => {
      const [_tsc, tscDone] = cmd('pnpm', [
        'tsc',
        '-p',
        'tsconfig.browser.json',
      ]);
      const { ret } = await tscDone;
      if (ret !== 0) {
        return {
          warnings: [
            { text: `Type checking failed: tsc exited with code ${ret}` },
          ],
        };
      }
      return {};
    });
  },
};

/** @param {boolean} watching
 */
async function buildClient(watching) {
  /** @type {esbuild.BuildOptions} */
  const esConf = {
    entryPoints: ['src/client/wetty.ts', 'src/client/dev.ts'],
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
          { from: './src/assets/favicon.ico', to: 'favicon.ico' },
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
  } else {
    esbuild.build(esConf);
  }
}

/** @param {boolean} watching
 */
async function buildServer(watching) {
  const tscArgs = ['tsc', '-p', 'tsconfig.node.json'];
  if (watching) tscArgs.push('--watch', '--preserveWatchOutput');
  const [_tsc, tscDone] = cmd('pnpm', tscArgs);
  if (!watching) await tscDone;
}

const watching = process.argv.includes('--watch');
// Build the Rust native addon first so that the TypeScript import resolves.
if (!watching) await buildRust();
await buildClient(watching);
await buildServer(watching);
