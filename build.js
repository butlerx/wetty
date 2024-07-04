import {spawn} from 'node:child_process';
import * as esbuild from 'esbuild';
import {copy} from 'esbuild-plugin-copy';
import {sassPlugin} from 'esbuild-sass-plugin';


/** @param {string} prog
 * @param {string[]} [args=[]] 
 * @returns {[ChildProcess, Promise<{ret: number, sig: NodeJS.Signals}>]}
 */
function cmd(prog, args=[]) {
    const proc = spawn(prog, args, { cwd: import.meta.dirname, stdio: "inherit", env: process.env});
    const done = new Promise((resolve, _reject) => {
        proc.addListener('exit',(ret, sig)=>{
            resolve({ret,sig});
        })
    });
    return [proc, done];
}

/** @type import('esbuild').Plugin */
const typechecker = {
    name: 'typechecker', 
    setup(build) {
        build.onStart(async () => {
            const [_tsc, tscDone] = cmd('pnpm', ['tsc', '-p', 'tsconfig.browser.json']);
            const {ret} = await tscDone;
            if (ret !== 0) {
                return {warnings: [{text:`Type checking failed: tsc exited with code ${ret}`}]}
            }
            return {};
        });
    }
};

/** @param {boolean} watching
 */
async function buildClient(watching){

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
                    {from: './src/assets/xterm_config/*', to: 'xterm_config'},
                    {from: './src/assets/favicon.ico', to: 'favicon.ico'},
                ],
                watch: watching,
            }),
        ],
        logLevel: 'info',
    };

    if (watching) {
        const buildCtx = await esbuild.context(esConf)
        await buildCtx.watch();
    } else {
        esbuild.build(esConf);
    }
}

/** @param {boolean} watching
 */
async function buildServer(watching) {
    const tscArgs = ['tsc', '-p', 'tsconfig.node.json'];
    if (watching) tscArgs.push('--watch','--preserveWatchOutput');
    const [_tsc, tscDone] = cmd('pnpm', tscArgs);
    if (!watching) await tscDone;
}

const watching = process.argv.includes('--watch');
await buildClient(watching);
await buildServer(watching);

