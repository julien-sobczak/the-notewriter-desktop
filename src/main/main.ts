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
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { spawn } from 'child_process';

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
  DeckConfig,
  EditorDynamicConfig,
  Note,
  CommandExecution,
  Reminder,
  determineNextReminder,
} from '../shared/Model';
import OperationsManager from './operations';
import { generateOid } from './oid';
import { NoteWriterSRS } from '../shared/srs';

const config = new ConfigManager();
const db = new DatabaseManager();
config
  .repositories()
  .forEach((repository) => db.registerRepository(repository));
const op = new OperationsManager();
config
  .repositories()
  .forEach((repository) => op.registerRepository(repository));
let configSaved = false; // true after saving configuration back to file before closing the application

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

/*
 * IPC
 */

let mainWindow: BrowserWindow | null = null;

ipcMain.on('edit', (_event, repositorySlug, relativePath, line) => {
  let relativeFileReference = relativePath;
  if (line > 0) {
    relativeFileReference += `:${line}`;
  }

  const repository = config
    .repositories()
    .find((w) => w.slug === repositorySlug);
  if (!repository) {
    console.log(`Unknown repository ${repositorySlug}`);
    return;
  }
  const repositoryPath = normalizePath(repository.path);

  // TODO support VISUAL/EDITOR-like env variables
  console.log(
    `Launching VS Code: code ${repositoryPath} -g ${repositoryPath}/${relativeFileReference}...`,
  );

  const subprocess = spawn(
    'code',
    [repositoryPath, '-g', `${repositoryPath}/${relativeFileReference}`],
    {
      detached: true,
      stdio: 'ignore',
    },
  );
  subprocess.on('error', (err) => {
    console.error(`Failed to edit ${relativePath}`, err);
  });
});

ipcMain.on('browse-url', (_event, url) => {
  console.debug(`Browsing URL: ${url}`);
  shell.openExternal(url).catch((error) => {
    console.error(`Failed to open URL ${url}`, error);
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

ipcMain.on('copyText', (_event, text) => {
  if (!text) return;
  console.debug(`Copy ${text}...`);
  clipboard.writeText(text);
  // new Notification({ title: "Copied!", body: text.substring(0, 10) + '...' }).show()
});

/* Two-way communication with the renderer process */
ipcMain.handle(
  'save-dynamic-config',
  (_event, dynamicConfig: EditorDynamicConfig) => {
    console.log('received save-dynamic-config');
    console.log('Saving...', dynamicConfig);
    // await config.save(dynamicConfig); // FIXME uncomment
    configSaved = true;
    mainWindow?.close();
    mainWindow = null;
  },
);
ipcMain.handle('list-files', async (event, repositorySlug: string) => {
  console.debug(`Listing files in repository ${repositorySlug}`);
  const result = await db.listFiles([repositorySlug]);
  console.debug(`Found ${result.length} files`);
  return result;
});
ipcMain.handle(
  'list-notes-in-file',
  async (_event, repositorySlug: string, relativePath: string) => {
    console.debug(
      `Listing note in file ${relativePath} in repository ${repositorySlug}`,
    );
    const result = await db.listNotesInFile(repositorySlug, relativePath);
    console.debug(
      `Found ${result.length} notes for file ${relativePath} in repository ${repositorySlug}`,
    );
    return result;
  },
);

ipcMain.handle('list-gotos', async (_event, repositorySlugs: string[]) => {
  const gotos = await db.getGotos(repositorySlugs);
  console.debug(`Found ${gotos.length} Goto links in all repositories`);
  return gotos;
});

ipcMain.handle(
  'find-by-wikilink',
  async (_event, repositorySlug: string, wikilink: string) => {
    console.debug(
      `Finding note from wikilink ${wikilink} in repository ${repositorySlug}`,
    );
    const result = await db.findByWikilink(repositorySlug, wikilink);
    console.debug(
      `Found note for wikilink ${wikilink} in repository ${repositorySlug}`,
    );
    return result;
  },
);
ipcMain.handle('find', async (_event, noteRef: NoteRef) => {
  console.debug(`Finding note from ref ${noteRef.oid}`);
  const result = await db.find(noteRef);
  console.debug(`Found note for ref ${result.oid}`);
  return result;
});
ipcMain.handle('mfind', async (_event, noteRefs: NoteRef[]) => {
  console.debug(`Finding notes for ${noteRefs.length} note ref(s)`);
  const results = await db.multiFind(noteRefs);
  console.debug(`Found ${results.length} note(s)`);
  return results;
});

async function doSearch(query: Query) {
  console.debug(
    `Searching for "${query.q}" in repositories ${query.repositories}`,
  );
  const result = await db.search(query);
  console.debug(`Found ${result.notes.length} notes`);
  return result;
}
ipcMain.handle('search', async (event, query: Query) => {
  return doSearch(query);
});

ipcMain.handle('msearch', async (_event, queries: Query[]) => {
  const results = await db.multiSearch(queries);
  return results;
});

ipcMain.handle('get-daily-quote', async () => {
  const { dailyQuote } = config.editorStaticConfig;
  if (!dailyQuote) {
    throw new Error('No daily quote found');
  }
  const query: Query = {
    q: dailyQuote.query,
    repositories: dailyQuote.repositories,
    blockId: undefined,
    deskId: undefined,
    limit: 0,
    shuffle: false,
  };
  const note = await db.searchDailyQuote(query);
  return note;
});

ipcMain.handle('get-statistics', async (_event, repositorySlugs) => {
  const statistics: Statistics = {
    countNotesPerType: new Map<string, number>(),
    countNotesPerNationality: new Map<string, number>(),
  };
  statistics.countNotesPerNationality =
    await db.countNotesPerNationality(repositorySlugs);
  statistics.countNotesPerType = await db.countNotesPerType(repositorySlugs);
  return statistics;
});

ipcMain.handle(
  'get-pending-reminders',
  async (_event, repositorySlugs: string[]) => {
    console.debug(`Getting pending reminders for ${repositorySlugs}`);
    const result = await db.getPendingReminders(repositorySlugs);
    console.debug(`Found ${result.length} pending reminders`);
    return result;
  },
);

ipcMain.handle(
  'get-past-memories',
  async (_event, repositorySlugs: string[]) => {
    console.debug(`Getting past memories for ${repositorySlugs}`);
    const result = await db.getPastMemories(repositorySlugs);
    console.debug(`Found ${result.length} past memories`);
    return result;
  },
);

ipcMain.handle('complete-reminders', async (_event, reminderOids: string[]) => {
  console.debug(`Completing reminders: ${reminderOids}`);

  // First, get all reminder details to get their repository slugs
  const allReminders = await db.getPendingReminders([]);
  const remindersToComplete = allReminders.filter((r) =>
    reminderOids.includes(r.oid),
  );

  const lastPerformedAt = new Date();

  // Complete each reminder by appending the operation to WAL and updating database
  for (const reminder of remindersToComplete) {
    // Append operation to WAL
    op.appendOperationToWal(reminder.repositorySlug, {
      oid: generateOid(),
      object_oid: reminder.oid,
      name: 'complete-reminder',
      timestamp: lastPerformedAt.toISOString(),
    });

    // Update the SQLite database immediately.
    // Avoid having to load the pack files when the WAL will be flushed
    // (and useful as the reminders may be rescheduled before the next flush).
    try {
      const nextPerformedAt = determineNextReminder(reminder, lastPerformedAt);
      const updatedReminder = await db.updateReminder(
        reminder.repositorySlug,
        reminder.oid,
        nextPerformedAt,
      );
      console.debug(
        `Reminder ${updatedReminder.oid} updated with new date:`,
        updatedReminder.nextPerformedAt,
      );
    } catch (error) {
      console.error(`Error updating reminder ${reminder.oid}:`, error);
      // Continue processing other reminders even if one fails
    }
  }

  console.debug(`Completed ${remindersToComplete.length} reminders`);
});

ipcMain.handle('list-decks', async (_event, repositorySlugs: string[]) => {
  console.debug(`Listing decks for repositories ${repositorySlugs}`);
  const decks: Deck[] = [];
  const statsPromises: Promise<void>[] = [];
  for (const repositorySlug of repositorySlugs) {
    const repositoryConfig = config.repositoryConfigs[repositorySlug];
    if (!repositoryConfig.decks) continue; // No decks configured for this repository

    for (let i = 0; i < repositoryConfig.decks.length; i++) {
      const deckConfig = repositoryConfig.decks[i];
      console.log(
        `Retrieving stats for deck ${deckConfig.name} in repository ${repositorySlug}`,
      );
      const promise = db
        .getDeckStats(repositorySlug, deckConfig)
        .then((deckStats) => {
          console.debug(`Found stats for deck ${deckConfig.name}`);
          // BUG FIXME now what if no rows are returned?????
          decks.push({
            repositorySlug,
            name: deckConfig.name,
            config: deckConfig,
            stats: deckStats,
          });
        });
      statsPromises.push(promise); // FIXME remove Seems empty
    }
  }

  await Promise.all(statsPromises);

  console.debug(
    `Found ${decks.length} decks for repositories ${repositorySlugs}`,
  );
  return decks;
});
ipcMain.handle('list-today-flashcards', async (_event, deckRef: DeckRef) => {
  console.debug(
    `Listing flashcards for today for repository ${deckRef.repositorySlug} and deck ${deckRef.name}`,
  );
  const repositoryConfig = config.repositoryConfigs[deckRef.repositorySlug];

  // Find the deck config
  let deckConfig: DeckConfig | undefined;
  for (const deck of repositoryConfig.decks) {
    if (deck.name === deckRef.name) {
      deckConfig = deck;
      break;
    }
  }

  if (!deckConfig) {
    console.error(
      `No deck configuration found for key ${deckRef.name} in repository ${deckRef.repositorySlug}`,
    );
    return []; // Send an empty array as response to stop the execution
  }

  const flashcards = await db.getTodayFlashcards(
    deckRef.repositorySlug,
    deckConfig,
  );
  console.debug(
    `Found ${flashcards.length} flashcards to study today for deck ${deckRef.name} in repository ${deckRef.repositorySlug}`,
  );
  return flashcards;
});

ipcMain.handle(
  'flush-operations',
  async (_event, repositorySlugs: string[]) => {
    for (const repositorySlug of repositorySlugs) {
      console.debug(`Flushing operations for repository ${repositorySlug}...`);
      // eslint-disable-next-line no-await-in-loop
      await op.flushWalToPackFiles(repositorySlug);
      console.debug(`Flushed operations for repository ${repositorySlug}`);
    }
  },
);
ipcMain.handle(
  'review-flashcard',
  async (
    _event,
    deckRef: DeckRef,
    flashcard: Flashcard,
    review: Review,
  ): Promise<Flashcard> => {
    const deckConfig = config.mustGetDeckConfig(deckRef);
    const algorithmName = deckConfig.algorithm || 'default';
    // IMPROVEMENT use algorithmSettings to customize the algorithm
    if (algorithmName !== 'default' && algorithmName !== 'Anki2') {
      throw new Error(`Algorithm ${algorithmName} is not supported yet`);
    }

    // Reschedule the flashcard using the SRS algorithm
    const algorithm = new NoteWriterSRS();
    const scheduledFlashcard = algorithm.schedule(
      deckConfig,
      flashcard,
      review,
    );
    // Update SRS settings based on the feedback
    review.dueAt = scheduledFlashcard.dueAt;
    review.settings = scheduledFlashcard.settings;

    // Record the operation in the WAL
    op.appendOperationToWal(deckRef.repositorySlug, {
      oid: generateOid(),
      object_oid: flashcard.oid,
      name: 'review-flashcard',
      timestamp: new Date().toISOString(),
      extras: { review },
    });
    console.debug(
      `Reviewing flashcard for repository ${deckRef.repositorySlug} and deck ${deckRef.name} and review ${review.feedback}`, // TODO reword this message
    );

    // Update the SQLite database immediately.
    // Avoid having to load the pack files when the WAL will be flushed
    // (and useful as the flashcard may be rescheduled before the next flush).
    return db
      .updateFlashcard(deckRef.repositorySlug, deckConfig, scheduledFlashcard)
      .then((updatedFlashcard: Flashcard) => {
        console.debug(
          `Flashcard ${updatedFlashcard.oid} updated with new settings:`,
          updatedFlashcard.settings,
        );
        return updatedFlashcard;
      })
      .catch((error: unknown) => {
        console.error('Error updating flashcard:', error);
        return flashcard; // Return the original flashcard in case of error
      });
  },
);

ipcMain.handle(
  'run-hooks',
  async (_event, note: Note): Promise<CommandExecution> => {
    console.debug(`Running hooks for note ${note.wikilink}`);

    const startTime = Date.now();

    return new Promise((resolve) => {
      console.log(
        `Executing hooks for ${note.wikilink} from ${note.repositoryPath}...`,
      );
      const subprocess = spawn('nt', ['run-hook', '--vvv', note.wikilink], {
        cwd: note.repositoryPath,
        env: {
          ...process.env,
          NT_HOME: '', // Avoid propagating NT_HOME also used by the-notewriter-desktop
        },
        stdio: 'pipe',
      });

      let stdout = '';
      let stderr = '';

      subprocess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      subprocess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      subprocess.on('close', (exitCode) => {
        const duration = Date.now() - startTime;
        const result: CommandExecution = {
          exitCode: exitCode || 0,
          duration,
          stdout,
          stderr,
        };
        console.debug(`Hook execution completed for ${note.wikilink}:`, result);
        resolve(result);
      });

      subprocess.on('error', (error) => {
        const duration = Date.now() - startTime;
        const result: CommandExecution = {
          exitCode: 1,
          duration,
          stdout,
          stderr: stderr + error.message,
        };
        console.error(`Error running hooks for ${note.wikilink}:`, error);
        resolve(result);
      });
    });
  },
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
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
      repositories: config.repositoryConfigs,
    });

    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.maximize();
      mainWindow.show();
    }
  });

  // Send configuration whenever the page finishes loading (including after refresh)
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }

    // Forward configuration state after page refresh
    mainWindow.webContents.send('configuration-loaded', {
      static: config.editorStaticConfig,
      dynamic: config.editorDynamicConfig,
      repositories: config.repositoryConfigs,
    });
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
