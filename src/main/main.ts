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

import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import ConfigManager from './config';
import DatabaseManager from './database';

const config = new ConfigManager();
const db = new DatabaseManager(); // TODO pass editorConfig?
config.workspaces().forEach((workspace) => db.registerWorkspace(workspace));
let configSaved = false; // true after saving configuration back to file before closing the application

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
  console.debug(`Searching for "${query}" in workspaces ${selectedWorkspaces}`);
  const notes = await db.search(query, selectedWorkspaces);
  console.debug(`Found ${notes.length} notes`);
  event.reply('search', notes);
});

ipcMain.on('get-daily-quote', async (event) => {
  const note = await db.searchDailyQuote();
  event.reply('get-daily-quote', note);
});

ipcMain.on('window-is-closing', async (event, dynamicConfig) => {
  console.log('received window-is-closing');
  await config.save(dynamicConfig);
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
