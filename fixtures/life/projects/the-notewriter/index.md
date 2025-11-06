---
project: The NoteWriter
status: done
---

# The NoteWriter

## Note: Synopsis

_The NoteWriter_ is a CLI to extract notes and various objects like reminders, flashcards.

## TODO: Backlog

`#bookmark` `#todo/code`

- [x] Publish the documentation website on GitHub Pages 📝 ❗ `#must-have` 😍
- [ ] Speed up medias conversion using goroutines ❓ 💪 `#could-have`
- [ ] Add an additional command `nt-reference` to manage references using Zotero [[#Anki Support]] `#should-have`
- [ ] Add an additional command `nt-anki` to import/export flashcards ⏸️ `#could-have`
- [ ] Reflect on using GitHub as a remote ❓ ⬇️

## Note: Repository

- [GitHub Repository](https://github.com/julien-sobczak/the-notewriter/${page:[issues,pulls,actions,...]} '#go/nt/github')
- [Documentation](https://julien-sobczak.github.io/the-notewriter/ '#go/nt/doc')
- [GitHub Demo](https://github.com/${org}/${repo} '#go/github')
- [Blog](https://juliensobczak.com/categories/${category:[read,write,inspect]} '#go/blog')

## Features

### Feature: Anki Support

Provide a CLI to create a Markdown file from a Anki `.apkg` file. Maybe provide the inverse operation (not indispensable to get started as the main motivation is to migrate from Anki).

### Feature: GitHub as Remote

The idea would be to use another GitHub repository to store the objects (`.nt/refs/origin/.git`).

The command `nt push` and `nt pull` would triggers a `git push` and `git pull` inside this repository.

The main motivation is to avoid relying on a S3 storage solution (which is rarely free).

## Note: Note-Taking Systems

- File-Based Solutions
  - [Obsidian](https://obsidian.md/) ★★★★ `#oss`
  - [Foam](https://github.com/foambubble/foam) ★★★ `#oss`
- Cloud-Based Services
  - [Notion](https://www.notion.so/) ★★
  - [Roam](https://roamresearch.com/) ★★
