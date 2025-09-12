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
npm run fixtures # Failed randomly. Rerun. Root cause still not found.
env NT_SKIP_DAILY_QUOTE=true NT_HOME=$PWD/fixtures npm run start
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

