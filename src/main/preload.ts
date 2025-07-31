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
  edit: (repositorySlug: string, filePath: string, line: number) =>
    ipcRenderer.send('edit', repositorySlug, filePath, line),

  // 2-way renderer to main
  getDailyQuote: () => ipcRenderer.invoke('get-daily-quote'),
  // Viewer
  find: (noteRef: NoteRef) => ipcRenderer.invoke('find', noteRef),
  mfind: (noteRefs: NoteRef[]) => ipcRenderer.invoke('mfind', noteRefs),
  search: (query: Query) => ipcRenderer.invoke('search', query),
  msearch: (queries: Query[]) => ipcRenderer.invoke('msearch', queries),
  listNotesInFile: (repositorySlug: string, filePath: string) =>
    ipcRenderer.invoke('list-notes-in-file', repositorySlug, filePath),
  listFiles: (repositorySlug: string) =>
    ipcRenderer.invoke('list-files', repositorySlug),
  // Statistics
  getStatistics: (repositorySlugs: string[]) =>
    ipcRenderer.invoke('get-statistics', repositorySlugs),
  // Settings
  getRepositoryConfig: (repositorySlug: string) =>
    ipcRenderer.invoke('get-repository-config', repositorySlug),
  saveDynamicConfig: (dynamicConfig: EditorDynamicConfig) =>
    ipcRenderer.invoke('save-dynamic-config', dynamicConfig),
  // Flashcards
  listDecks: (repositorySlugs: string[]) =>
    ipcRenderer.invoke('list-decks', repositorySlugs),
  listTodayFlashcards: (deckRef: DeckRef) =>
    ipcRenderer.invoke('list-today-flashcards', deckRef),

  // Operations
  flushOperations: (repositorySlugs: string[]) =>
    ipcRenderer.invoke('flush-operations', repositorySlugs),
  reviewFlashcard: (deckRef: DeckRef, flashcard: Flashcard, review: Review) =>
    ipcRenderer.invoke('review-flashcard', deckRef, flashcard, review),
});

// export type ElectronHandler = typeof electronHandler;
