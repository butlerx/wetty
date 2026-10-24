import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import { sassPlugin } from 'esbuild-sass-plugin';

/** @param {string} prog
 * @param {string[]} [args=[]]
 * @returns {Promise<void>}
 */
export function cmd(prog, args = []) {
  const proc = spawn(prog, args, {
    cwd: import.meta.dirname,
    stdio: 'inherit',
    env: process.env,
  });
  return new Promise((resolve, reject) => {
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
  } else {
    await esbuild.build(esConf);
  }
}

/** @param {boolean} watching
 */
async function buildServer(watching) {
  const tscArgs = ['tsc', '-p', 'tsconfig.node.json'];
  if (watching) {
    tscArgs.push('--watch', '--preserveWatchOutput');
  } else {
    tscArgs.push('--incremental', 'false');
  }
  const tscDone = cmd('pnpm', tscArgs);
  if (!watching) await tscDone;
}

export async function main() {
  const watching = process.argv.includes('--watch');
  if (!watching) {
    await rm(new URL('./build', import.meta.url), {
      recursive: true,
      force: true,
    });
  }
  await buildClient(watching);
  await buildServer(watching);
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
