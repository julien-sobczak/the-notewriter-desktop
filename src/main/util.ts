/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import os from 'os';
import path from 'path';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

// Returns an absolute normalized path.
export function normalizePath(relativePath: string) {
  let normalizedPath = relativePath;
  normalizedPath = normalizedPath.replace('~', os.homedir);
  normalizedPath = normalizedPath.replace('$PWD', process.cwd());
  return path.normalize(normalizedPath);
}
