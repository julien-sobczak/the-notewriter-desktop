import os from 'os';
import path from 'path';
import { normalizePath } from './util';

describe('normalizePath', () => {
  const homedir = os.homedir();
  const cwd = process.cwd();

  it('replaces ~ with the user home directory', () => {
    const input = '~/documents/file.txt';
    const expected = path.normalize(`${homedir}/documents/file.txt`);
    expect(normalizePath(input)).toBe(expected);
  });

  it('replaces $PWD with the current working directory', () => {
    const input = '$PWD/src/index.js';
    const expected = path.normalize(`${cwd}/src/index.js`);
    expect(normalizePath(input)).toBe(expected);
  });

  it('normalizes a path without ~ or $PWD', () => {
    const input = 'foo/bar/../baz.txt';
    const expected = path.normalize('foo/bar/../baz.txt');
    expect(normalizePath(input)).toBe(expected);
  });
});
