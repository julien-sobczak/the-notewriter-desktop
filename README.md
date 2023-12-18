# The NoteWriter Desktop

<div align="center">

[![Build Status][github-actions-status]][github-actions-url]
[![Github Tag][github-tag-image]][github-tag-url]

</div>

## Install

Clone the repo and install dependencies:

```bash
git clone https://github.com/julien-sobczak/the-notewriter-desktop.git
cd the-notewriter-desktop
npm install
```

## Starting Development

Start the app in the `dev` environment:

```bash
npm run fixtures
npm start
```

## Packaging for Production

To package apps for the local platform:

```bash
npm run package
```

[github-actions-status]: https://github.com/julien-sobczak/the-notewriter-desktop/workflows/Test/badge.svg
[github-actions-url]: https://github.com/julien-sobczak/the-notewriter-desktop/actions
[github-tag-image]: https://img.shields.io/github/tag/julien-sobczak/the-notewriter-desktop.svg?label=version
[github-tag-url]: https://github.com/julien-sobczak/the-notewriter-desktop/releases/latest


## How to

### Inspect the SQLite database

```shell
$ open -a "DB Browser for SQLite" ./fixtures/life/.nt/database.db
```


## Troubleshooting

### `Cannot use import statement outside a module`

Problem:

```
> jest
 FAIL  src/main/config.test.ts
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    Details:

    /Users/julien/Workshop/the-notewriter-desktop/node_modules/yaml/browser/index.js:3
    import * as YAML from './dist/index.js'
    ^^^^^^

    SyntaxError: Cannot use import statement outside a module

      2 | import os from 'os';
      3 | import fs from 'fs';
    > 4 | import YAML from 'yaml';
        | ^
      5 | import toml from 'toml';
      6 |

      at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1495:14)
      at Object.<anonymous> (src/main/config.ts:4:1)
      at Object.<anonymous> (src/main/config.test.ts:4:1)
```

Edit Jest configuration in `package.json` to force the node module to be transformed:

```json
"transformIgnorePatterns": ["/node_modules/(?!yaml)"]
```
