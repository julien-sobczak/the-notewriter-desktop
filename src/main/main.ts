/* eslint-disable promise/no-nesting */
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
  IpcMainEvent,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { spawn } from 'child_process';
import express from 'express';

import MenuBuilder from './menu';
import { resolveHtmlPath, normalizePath } from './util';
import ConfigManager from './config';
import DatabaseManager from './database';
import {
  Query,
  NoteRef,
  Statistics,
  Deck,
  DeckRef,
  Flashcard,
  Review,
} from '../shared/Model';

const config = new ConfigManager();
const db = new DatabaseManager();
config.workspaces().forEach((workspace) => db.registerWorkspace(workspace));
let configSaved = false; // true after saving configuration back to file before closing the application

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

/*
 * Local REST API.
 *
 * The motivation is to make easy for query notes from any React components.
 * Using IPC is challenging when several components want to consumme the same channel.
 */
const api = express();
api.use(express.json());
const port = process.env.PORT || 3000;
api.get('/status', (request, response) => {
  response.send({
    Status: 'Running',
  });
});
api.post('/list-files', async (request, response) => {
  const workspaceSlugs = request.body as string[];
  console.debug(`POST /list-files received for workspaces ${workspaceSlugs}`);
  const results = await db.listFiles(workspaceSlugs);
  console.debug(
    `Found ${results.length} files for workspaces ${workspaceSlugs}`
  );
  response.send(results);
});
api.post('/find', async (request, response) => {
  const noteRef = request.body as NoteRef;
  console.debug(`POST /find received for note ref ${noteRef.oid}`);
  const result = await db.find(noteRef);
  console.debug(`Found note for ref ${noteRef.oid}`);
  response.send(result);
});
api.post('/multi-find', async (request, response) => {
  const noteRefs = request.body as NoteRef[];
  console.debug(`POST /multi-find received for ${noteRefs.length} note ref(s)`);
  const results = await db.multiFind(noteRefs);
  console.debug(`Found ${results.length} note(s)`);
  response.send(results);
});
api.post('/search', async (request, response) => {
  const query = request.body as Query;
  console.debug(`POST /search received for query ${query.q}`);
  const result = await db.search(query);
  console.debug(`Found ${result.notes.length} note(s)`);
  response.send(result);
});
api.post('/multi-search', async (request, response) => {
  const queries = request.body as Query[];
  console.debug(`POST /multi-search received for ${queries.length} queries`);
  const results = await db.multiSearch(queries);
  console.debug(`Found ${results.length} note(s)`);
  response.send(results);
});
api.post('/list-decks', async (request, response) => {
  const workspaceSlugs = request.body as string[];
  console.debug(`POST /list-decks received for workspaces ${workspaceSlugs}`);

  const decks: Deck[] = [];
  for (const workspaceSlug of workspaceSlugs) {
    const collectionConfig = config.collectionConfigs[workspaceSlug];
    const deckKeys = Object.keys(collectionConfig.deck);
    console.log('Searching into decks', collectionConfig.deck, deckKeys); // FIXME remove
    const deckConfigs = deckKeys.map(
      (deckKey) => collectionConfig.deck[deckKey]
    );
    for (let i = 0; i < deckConfigs.length; i++) {
      const deckConfig = deckConfigs[i];
      // TODO find a better syntax to retrieve stats in parallel
      // eslint-disable-next-line no-await-in-loop
      const deckStats = await db.getDeckStats(workspaceSlug, deckConfig);
      decks.push({
        workspaceSlug,
        key: deckKeys[i],
        config: deckConfig,
        stats: deckStats,
      });
    }
  }

  console.log('Outer=', decks.length); // FIXME remove
  console.debug(`Found ${decks.length} decks for workspaces ${workspaceSlugs}`);
  response.send(decks);
});
api.post('/list-today-flashcards', async (request, response) => {
  const deckRef = request.body as DeckRef;
  console.debug(
    `POST /list-today-flashcards received for workspace ${deckRef.workspaceSlug} and deck ${deckRef.key}`
  );
  const collectionConfig = config.collectionConfigs[deckRef.workspaceSlug];
  const deckConfig = collectionConfig.deck[deckRef.key];
  const flashcards = await db.getTodayFlashcards(
    deckRef.workspaceSlug,
    deckConfig
  );
  console.debug(
    `Found ${flashcards.length} flashcards to study today for deck ${deckRef.key} in workspace ${deckRef.workspaceSlug}`
  );
  response.send(flashcards);
});
api.post('/update-flashcard', async (request, response) => {
  const { deckRef, flashcard } = request.body as {
    deckRef: DeckRef;
    flashcard: Flashcard;
    review: Review;
  };
  console.debug(
    `POST /update-flashcard received for workspace ${deckRef.workspaceSlug} and deck ${deckRef.key}`
  );

  // 1. Update in DB
  const collectionConfig = config.collectionConfigs[deckRef.workspaceSlug];
  const deckConfig = collectionConfig.deck[deckRef.key];
  await db.updateFlashcard(deckRef.workspaceSlug, deckConfig, flashcard);

  // 2. Append review to local study
  

  console.debug(
    `Flashcard ${flashcard.noteShortTitle} updated for deck ${deckRef.key} in workspace ${deckRef.workspaceSlug}`
  );
  response.send(flashcard);
});
api.listen(port, () => {
  console.log(`Server Listening on PORT: ${port}`);
});

/*
 * IPC
 */

let mainWindow: BrowserWindow | null = null;

ipcMain.on('edit', (event, workspaceSlug, relativePath, line) => {
  let relativeFileReference = relativePath;
  if (line > 0) {
    relativeFileReference += `:${line}`;
  }

  const workspace = config.workspaces().find((w) => w.slug === workspaceSlug);
  if (!workspace) {
    console.log(`Unknown workspace ${workspaceSlug}`);
    return;
  }
  const workspacePath = normalizePath(workspace.path);

  // TODO support VISUAL/EDITOR-like env variables
  console.log(
    `Launching VS Code: code ${workspacePath} -g ${workspacePath}/${relativeFileReference}...`
  );

  const subprocess = spawn(
    'code',
    [workspacePath, '-g', `${workspacePath}/${relativeFileReference}`],
    {
      detached: true,
      stdio: 'ignore',
    }
  );
  subprocess.on('error', (err) => {
    console.error(`Failed to edit ${relativePath}`, err);
  });
});

ipcMain.on('copy', (event, text) => {
  // 1. Use the clipboard API
  clipboard.writeText(text);
  console.log('Text copied to clipboard');

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

ipcMain.on('list-files', async (event, workspaceSlug: string) => {
  console.debug(`Listing files in workspace ${workspaceSlug}`);
  const result = await db.listFiles([workspaceSlug]);
  console.debug(`Found ${result.length} files`);
  event.reply('list-files', result);
});
ipcMain.on(
  'list-notes-in-file',
  async (event, workspaceSlug: string, relativePath: string) => {
    console.debug(
      `Listing note in file ${relativePath} in workspace ${workspaceSlug}`
    );
    const result = await db.listNotesInFile(workspaceSlug, relativePath);
    console.debug(
      `Found ${result.length} notes for file ${relativePath} in workspace ${workspaceSlug}`
    );
    event.reply('list-notes-in-file', result);
  }
);

async function doSearch(channel: string, event: IpcMainEvent, query: Query) {
  console.debug(`Searching for "${query.q}" in workspaces ${query.workspaces}`);
  const result = await db.search(query);
  console.debug(`Found ${result.notes.length} notes`);
  event.reply(channel, result);
}
ipcMain.on('search', async (event, query: Query) => {
  doSearch('search', event, query);
});
// TODO probably delete following events (use the REST API instead)
ipcMain.on('search-desk0', async (event, query: Query) => {
  doSearch('search-desk0', event, query);
});
ipcMain.on('search-desk1', async (event, query: Query) => {
  doSearch('search-desk1', event, query);
});
ipcMain.on('search-desk2', async (event, query: Query) => {
  doSearch('search-desk2', event, query);
});
ipcMain.on('search-desk3', async (event, query: Query) => {
  doSearch('search-desk3', event, query);
});
ipcMain.on('search-desk4', async (event, query: Query) => {
  doSearch('search-desk4', event, query);
});
ipcMain.on('search-desk5', async (event, query: Query) => {
  doSearch('search-desk5', event, query);
});
ipcMain.on('search-desk6', async (event, query: Query) => {
  doSearch('search-desk6', event, query);
});
ipcMain.on('search-desk7', async (event, query: Query) => {
  doSearch('search-desk7', event, query);
});
ipcMain.on('search-desk8', async (event, query: Query) => {
  doSearch('search-desk8', event, query);
});
ipcMain.on('search-desk9', async (event, query: Query) => {
  doSearch('search-desk9', event, query);
});

ipcMain.on('multi-search', async (event, queries: Query[]) => {
  const results = await db.multiSearch(queries);
  event.reply('multi-search', results);
});

ipcMain.on('get-daily-quote', async (event) => {
  const { dailyQuote } = config.editorStaticConfig;
  if (!dailyQuote) {
    throw new Error('No daily quote found');
  }
  const query: Query = {
    q: dailyQuote.query,
    workspaces: dailyQuote.workspaces,
    blockId: undefined,
    deskId: undefined,
    limit: 0,
    shuffle: false,
  };
  const note = await db.searchDailyQuote(query);
  event.reply('get-daily-quote', note);
});

ipcMain.on('get-statistics', async (event, workspaceSlugs) => {
  const statistics: Statistics = {
    countNotesPerKind: new Map<string, number>(),
    countNotesPerNationality: new Map<string, number>(),
  };
  statistics.countNotesPerNationality = await db.countNotesPerNationality(
    workspaceSlugs
  );
  statistics.countNotesPerKind = await db.countNotesPerKind(workspaceSlugs);
  event.reply('get-statistics', statistics);
});

ipcMain.on('window-is-closing', async (event, dynamicConfig) => {
  console.log('received window-is-closing');
  console.log('Saving...', dynamicConfig);
  // await config.save(dynamicConfig); // FIXME uncomment
  configSaved = true;
  mainWindow?.close();
  mainWindow = null;
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
      // Impossible to reference local files in <img src="file://" /> with the default settings.
      // See https://stackoverflow.com/questions/61623156/electron-throws-not-allowed-to-load-local-resource-when-using-showopendialog
      // A non-optimal solution is to disable the security:
      webSecurity: false, // TODO use a custom protocol instead

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

    // Forward configuration state
    mainWindow.webContents.send('configuration-loaded', {
      static: config.editorStaticConfig,
      dynamic: config.editorDynamicConfig,
      collections: config.collectionConfigs,
    });

    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.maximize();
      mainWindow.show();
    }
  });

  mainWindow.on('close', (event: any) => {
    if (!configSaved && mainWindow) {
      event.preventDefault();
      mainWindow.webContents.send('window-is-closing');
    }
  });

  // Redirect external links to the browser
  // See https://stackoverflow.com/questions/32402327/how-can-i-force-external-links-from-browser-window-to-open-in-a-default-browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log(`Opening external url ${url}...`);
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

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
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));

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
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }
  app.quit(); // FIXME uncomment above lines when development is complete
});
app.on('quit', () => {
  db.close();
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
