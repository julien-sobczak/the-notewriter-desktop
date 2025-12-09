# The NoteWriter Desktop

<div align="center">

[![Build Status][github-actions-status]][github-actions-url]
[![Github Tag][github-tag-image]][github-tag-url]

</div>

## Installing

### Using the install script (recommended)

The easiest way to install _The NoteWriter Desktop_ is using the installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/julien-sobczak/the-notewriter-desktop/main/install.sh | sh
```

This will download the latest release for your platform and install it to `$HOME/.nt-desktop/bin`. Follow the instructions printed by the script to add the directory to your `$PATH` (Linux only - on macOS and Windows, follow the installation prompts).

You can also install a specific version by passing the version tag as an argument:

```bash
curl -fsSL https://raw.githubusercontent.com/julien-sobczak/the-notewriter-desktop/main/install.sh | sh -s v0.1.0
```

### Manual installation

You can download the latest prebuilt binaries for Linux, macOS, and Windows from the [Releases page](https://github.com/julien-sobczak/the-notewriter-desktop/releases).

#### Latest release

You can always fetch the latest version directly using GitHub's `/releases/latest` endpoint:

| Platform | Download link |
|-----------|----------------|
| **Linux (amd64)**   | [Download](https://github.com/julien-sobczak/the-notewriter-desktop/releases/latest/download/the-notewriter-desktop-linux-amd64.AppImage) |
| **macOS (amd64)**   | [Download](https://github.com/julien-sobczak/the-notewriter-desktop/releases/latest/download/the-notewriter-desktop-darwin-amd64.dmg) |
| **macOS (arm64)**   | [Download](https://github.com/julien-sobczak/the-notewriter-desktop/releases/latest/download/the-notewriter-desktop-darwin-arm64.dmg) |
| **Windows (amd64)** | [Download](https://github.com/julien-sobczak/the-notewriter-desktop/releases/latest/download/the-notewriter-desktop-windows-amd64.exe) |

#### Example (Linux)

```bash
# Download the AppImage
curl -L https://github.com/julien-sobczak/the-notewriter-desktop/releases/latest/download/the-notewriter-desktop-linux-amd64.AppImage -o nt-desktop.AppImage

# Make it executable
chmod +x nt-desktop.AppImage

# Move it to a directory in your PATH (optional)
mkdir -p ~/.local/bin
mv nt-desktop.AppImage ~/.local/bin/nt-desktop
```

## Releasing

Create a tag in [GitHub](https://github.com/julien-sobczak/the-notewriter-desktop/tags) or run the commands locally:

```bash
# Trigger release
$ git tag v0.1.0 && git push origin v0.1.0

# Install latest
$ curl -fsSL https://raw.githubusercontent.com/julien-sobczak/the-notewriter-desktop/main/install.sh | sh
```

## Development

### Install

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

[github-actions-status]: https://github.com/julien-sobczak/the-notewriter-desktop/workflows/CI/badge.svg
[github-actions-url]: https://github.com/julien-sobczak/the-notewriter-desktop/actions
[github-tag-image]: https://img.shields.io/github/tag/julien-sobczak/the-notewriter-desktop.svg?label=version
[github-tag-url]: https://github.com/julien-sobczak/the-notewriter-desktop/releases/latest
