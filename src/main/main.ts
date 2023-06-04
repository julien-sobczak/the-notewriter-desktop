/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  globalShortcut,
  clipboard,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import YAML from 'yaml';
import { Database, verbose as sqlite3Verbose } from 'sqlite3';

import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { Note } from '../shared/model/Note';

sqlite3Verbose();

interface Workspace {
  name: string;
  slug: string;
  path: string;
  selected: boolean;
}
interface EditorConfig {
  workspaces: Workspace[];
}

let editorConfig: EditorConfig | null = null;
// List of datasources based on workspaces defined in global configuration
const datasources = new Map<string, Database>();

// Returns an absolute normalized path.
function normalizePath(relativePath: string) {
  return path.normalize(relativePath.replace('~', os.homedir));
}

const homeConfigPath = path.join(os.homedir(), '.nt/editorconfig.yaml'); // TODO support .yml too
if (fs.existsSync(homeConfigPath)) {
  const data = fs.readFileSync(homeConfigPath, 'utf8');
  editorConfig = YAML.parse(data) as EditorConfig;
  console.log('ici', editorConfig); // FIXME remove
  editorConfig.workspaces.forEach((workspace) => {
    const dbPath = path.join(normalizePath(workspace.path), '.nt/database.db');
    if (fs.existsSync(dbPath)) {
      console.debug(`Using database ${dbPath}`);
      const db = new Database(dbPath);
      datasources.set(workspace.slug, db);
    }
    // else TODO
  });
}

// TODO delete?
function searchMatch(pattern: string) {
  const db = datasources.get('main');
  if (!db) {
    throw new Error('No datasource found');
  }
  return new Promise<any[]>((resolve, reject) => {
    db.all(
      `SELECT note_fts.rowid as id, note.oid, note.content_raw FROM note_fts JOIN note on note.oid = note_fts.oid where note_fts MATCH ?`,
      pattern,
      (err: any, rows: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

// TODO delete?
async function searchMatchSync(pattern: string) {
  try {
    const rows = await searchMatch(pattern);
    console.log(`Found ${rows.length} results`);
    rows.map((row) => {
      console.log(`${row.id}: ${row.oid} ${row.content_raw}`);
      return undefined;
    });
  } catch (e: any) {
    console.error(e.message);
  }
}

async function searchDailyQuote() {
  const db = datasources.get('main');
  if (!db) {
    throw new Error('No datasource found');
  }
  return new Promise<Note>((resolve, reject) => {
    db.all(
      `
        SELECT
          oid,
          file_oid,
          kind,
          relative_path,
          wikilink,
          attributes,
          tags,
          line,
          title_html,
          content_html,
          comment_html
        FROM note
        WHERE kind = 'quote'
        ORDER BY RANDOM()
        LIMIT 1`,
      (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for daily quote', err);
          reject(err);
        } else {
          const row = rows[0];
          const note = {
            oid: row.oid,
            oidFile: row.file_oid,
            kind: row.kind,
            relativePath: row.relative_path,
            wikilink: row.wikilink,
            attributes: {}, // TODO parse row.attributes,
            tags: [], // TODO parse row.tags,
            line: row.line,
            title: row.title_html,
            content: row.content_html,
            comment: row.comment_html,
          };
          resolve(note);
        }
      }
    );
  });
}

async function search(query: string, selectedWorkspaces: string[] = []) {
  const db = datasources.get('main');
  if (!db) {
    throw new Error('No datasource found');
  }
  console.debug(selectedWorkspaces); // FIXME remove
  // TODO convert query to SQL
  return new Promise<Note[]>((resolve, reject) => {
    db.all(
      `
        SELECT
          oid,
          file_oid,
          kind,
          relative_path,
          wikilink,
          attributes,
          tags,
          line,
          title_html,
          content_html,
          comment_html
        ${query}
        FROM note
        LIMIT 100`,
      (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for notes', err);
          reject(err);
        } else {
          const notes: Note[] = [];
          rows.forEach((row: any) => {
            const note = {
              oid: row.oid,
              oidFile: row.file_oid,
              kind: row.kind,
              relativePath: row.relative_path,
              wikilink: row.wikilink,
              attributes: {}, // TODO parse row.attributes,
              tags: [], // TODO parse row.tags,
              line: row.line,
              title: row.title_html,
              content: row.content_html,
              comment: row.comment_html,
            };
            notes.push(note);
          });
          resolve(notes);
        }
      }
    );
  });
}

/* FIXME to remove
db.serialize(async () => {
  console.log('Searching for patterns');
  searchSync('book');
  db.close();
});
*/

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('edit', (event, workspace, relativePath, line) => {
  let relativeFileReference = relativePath;
  if (line > 0) {
    relativeFileReference += `:${line}`;
  }

  // TODO support VISUAL/EDITOR-like env variables
  console.log(
    `Launching VS Code: code ${workspace} -g ${relativeFileReference}...`
  );

  const subprocess = spawn('code', [workspace, '-g', relativeFileReference], {
    detached: true,
    stdio: 'ignore',
  });
  subprocess.on('error', (err) => {
    console.error(`Failed to edit ${relativePath}`, err);
  });
});

ipcMain.on('copy', (event, text) => {
  // 1. Use the clipboard API
  clipboard.writeText(text);

  // 2. Minimize the window
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  if (win != null) win.minimize();
});

ipcMain.on('copyText', (event, text) => {
  if (!text) return;
  console.debug(`Copy ${text}...`);
  clipboard.writeText(text);
  // new Notification({ title: "Copied!", body: text.substring(0, 10) + '...' }).show()
});

ipcMain.on('search', async (event, query, selectedWorkspaces = undefined) => {
  const notes = await search(query, selectedWorkspaces);
  event.reply('search', notes);
});

ipcMain.on('get-daily-quote', async (event) => {
  const note = await searchDailyQuote();
  event.reply('get-daily-quote', note);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.maximize();
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Redirect external links to the browser
  // See https://stackoverflow.com/questions/32402327/how-can-i-force-external-links-from-browser-window-to-open-in-a-default-browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(() => {
    // Global shortcut are activated even when the window has not the focus
    globalShortcut.register('Alt+Space', () => {
      // I observed a beep when pressing a global shortcut using some combinations (ex: Control+CommandOrControl+F)
      // See this issue that seems related: https://github.com/electron/electron/issues/2617
      // A workaround is to customize the key binding on MacOS using a file
      // ~/Library/KeyBindings/DefaultKeyBinding.dic
      // Note: I no longer observe this behavior with the current shortcut.
      //
      // "Control+CommandOrControl+F" => Beep on MacOS
      // "Control+Shift+CommandOrControl+F" => OK on MacOS

      const windows = BrowserWindow.getAllWindows();
      if (windows.length === 0) {
        createWindow();
      } else {
        const mainOriginalWindow = windows[0];
        mainOriginalWindow.webContents.send('clean');
        mainOriginalWindow.show();
        mainOriginalWindow.focus();
      }
    });

    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch((err) => console.log(err));

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('quit', () => {
  datasources.forEach((db, name) => {
    console.debug(`Closing datasource ${name}`);
    db.close();
  });
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
