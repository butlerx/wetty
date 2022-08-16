import express from 'express';
import { assetsPath } from './shared/path.js';

export const trim = (str: string): string => str.replace(/\/*$/, '');

export async function serveStatic(
  path: string,
): Promise<express.RequestHandler> {
  const assets = await assetsPath();
  return express.static(assets(path));
}
