import { resolve } from 'path';
import express from 'express';

export const trim = (str: string): string => str.replace(/\/*$/, '');
export const serveStatic = (path: string) =>
  express.static(resolve(process.cwd(), 'build', path));
