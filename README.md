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

### Development

```bash
npm run fixtures # Failed randomly. Rerun. Root cause still not found.
$ npm run dev

# Launch existing tests
$ npm run test src/renderer/src/helpers/ 
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## How to

### Inspect the SQLite database

```shell
$ open -a "DB Browser for SQLite" ./fixtures/life/.nt/database.db
```
