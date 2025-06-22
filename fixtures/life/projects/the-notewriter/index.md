# The NoteWriter

## TODO: Backlog

* [x] Publish the documentation website on GitHub Pages
* [ ] Speed up medias conversion using goroutines
* [ ] Add an additional command `nt-reference` to manage references using Zotero [[#Anki Support]]
* [ ] Add an additional command `nt-anki` to import/export flashcards
* [ ] Reflect on using GitHub as a remote


## Features


### Note: Anki Support

Provide a CLI to create a Markdown file from a Anki `.apkg` file. Maybe provide the inverse operation (not indispensable to get started as the main motivation is to migrate from Anki).


### Note: GitHub as Remote

The idea would be to use another GitHub repository to store the objects (`.nt/refs/origin/.git`).

The command `nt push` and `nt pull` would triggers a `git push` and `git pull` inside this repository.

The main motivation is to avoid relying on a S3 storage solution (which is rarely free).


## Note: Note-Taking Systems

* File-Based Solutions
  * [Obsidian](https://obsidian.md/)
  * [Foam](https://github.com/foambubble/foam)
* Cloud-Based Services
  * [Notion](https://www.notion.so/)
  * [Roam](https://roamresearch.com/)
