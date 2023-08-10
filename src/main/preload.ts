// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
  | 'ipc-example'
  | 'get-daily-quote'
  | 'search'
  | 'search-desk0'
  | 'search-desk1'
  | 'search-desk2'
  | 'search-desk3'
  | 'search-desk4'
  | 'search-desk5'
  | 'search-desk6'
  | 'search-desk7'
  | 'search-desk8'
  | 'search-desk9'
  | 'list-files'
  | 'list-notes-in-file'
  | 'configuration-loaded'
  | 'window-is-closing';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
