# TODO

* [x] Rewrite `config` under `fixtures/`
* [ ] Update `Model.ts` with new DB model and new config file format
* [ ] Update SQL queries
* [ ] Make application start again... 😓
* [x] Update deps from `https://github.com/electron-react-boilerplate/electron-react-boilerplate/tree/8d3efc1426e91bae90e85b829ca338b14f61be03` to latest
* [ ] Use `invoke` to avoid starting a local HTTP server to answer queries from `main.ts` (see [doc](https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-2-renderer-to-main-two-way)) + remove `express` dependency
* [ ] Add `npm run:gocloc` to match `the-notewriter`
* [ ] Rename "workspaceSlug" and other workspace-related stuffs into "repositorySlug"
* [ ] Remove in a new commit `"trailingComma": "none"` in `package.json` and add missing commas in the codebase
