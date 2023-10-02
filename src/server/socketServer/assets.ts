import serve from 'serve-static';
import { assetsPath } from './shared/path.js';

export const trim = (str: string): string => str.replace(/\/*$/, '');
export const serveStatic = (path: string) => serve(assetsPath(path));
