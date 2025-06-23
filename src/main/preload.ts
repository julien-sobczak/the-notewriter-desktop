// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer } from 'electron';
import {
  DeckRef,
  EditorDynamicConfig,
  Flashcard,
  NoteRef,
  Query,
  Review,
} from '../shared/Model';

contextBridge.exposeInMainWorld('electron', {
  // Main to renderer
  onConfigurationLoaded: (callback: any) =>
    ipcRenderer.on('configuration-loaded', (_event, value) => callback(value)),
  onClean: (callback: any) =>
    ipcRenderer.on('clean', (_event, value) => callback(value)),
  onWindowIsClosing: (callback: any) =>
    ipcRenderer.on('window-is-closing', (_event, value) => callback(value)),

  // 1-way renderer to main
  edit: (workspaceSlug: string, filePath: string, line: number) =>
    ipcRenderer.send('edit', workspaceSlug, filePath, line),

  // 2-way renderer to main
  getDailyQuote: () => ipcRenderer.invoke('get-daily-quote'),
  // Viewer
  find: (noteRef: NoteRef) => ipcRenderer.invoke('find', noteRef),
  mfind: (noteRefs: NoteRef[]) => ipcRenderer.invoke('mfind', noteRefs),
  search: (query: Query) => ipcRenderer.invoke('search', query),
  mearch: (queries: Query[]) => ipcRenderer.invoke('msearch', queries),
  listNotesInFile: (workspaceSlug: string, filePath: string) =>
    ipcRenderer.invoke('list-notes-in-file', workspaceSlug, filePath),
  listFiles: (workspaceSlug: string) =>
    ipcRenderer.invoke('list-files', workspaceSlug),
  // Statistics
  getStatistics: (workspaceSlugs: string[]) =>
    ipcRenderer.invoke('get-statistics', workspaceSlugs),
  // Settings
  getWorkspaceConfig: (workspaceSlug: string) =>
    ipcRenderer.invoke('get-workspace-config', workspaceSlug),
  saveDynamicConfig: (dynamicConfig: EditorDynamicConfig) =>
    ipcRenderer.invoke('save-dynamic-config', dynamicConfig),
  // Flashcards
  listDecks: (workspaceSlugs: string[]) =>
    ipcRenderer.invoke('list-decks', workspaceSlugs),
  listTodayFlashcards: (deckRef: DeckRef) =>
    ipcRenderer.invoke('list-today-flashcards', deckRef),
  updateFlashcard: (deckRef: DeckRef, flashcard: Flashcard, review: Review) =>
    ipcRenderer.invoke('update-flashcard', deckRef, flashcard, review),
});

// export type ElectronHandler = typeof electronHandler;
