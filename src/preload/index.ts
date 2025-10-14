import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  DeckRef,
  EditorDynamicConfig,
  Flashcard,
  Note,
  NoteRef,
  Query,
  Review
} from '../main/Model'

// Custom APIs for renderer
const api = {
  // Expose some environment variables
  env: {
    NT_SKIP_DAILY_QUOTE: process.env.NT_SKIP_DAILY_QUOTE
  },

  // Main to renderer
  onConfigurationLoaded: (callback: any) =>
    ipcRenderer.on('configuration-loaded', (_event, value) => callback(value)),
  onClean: (callback: any) => ipcRenderer.on('clean', (_event, value) => callback(value)),
  onWindowIsClosing: (callback: any) =>
    ipcRenderer.on('window-is-closing', (_event, value) => callback(value)),

  // 1-way renderer to main
  edit: (repositorySlug: string, filePath: string, line: number) =>
    ipcRenderer.send('edit', repositorySlug, filePath, line),
  browseUrl: (url: string) => ipcRenderer.send('browse-url', url),

  // 2-way renderer to main
  getDailyQuote: () => ipcRenderer.invoke('get-daily-quote'),
  // Viewer
  find: (noteRef: NoteRef) => ipcRenderer.invoke('find', noteRef),
  mfind: (noteRefs: NoteRef[]) => ipcRenderer.invoke('mfind', noteRefs),
  findByWikilink: (repositorySlug: string, wikilink: string) =>
    ipcRenderer.invoke('find-by-wikilink', repositorySlug, wikilink),
  search: (query: Query) => ipcRenderer.invoke('search', query),
  msearch: (queries: Query[]) => ipcRenderer.invoke('msearch', queries),
  listNotesInFile: (repositorySlug: string, filePath: string) =>
    ipcRenderer.invoke('list-notes-in-file', repositorySlug, filePath),
  listFiles: (repositorySlug: string) => ipcRenderer.invoke('list-files', repositorySlug),
  listGotos: (repositorySlugs: string[]) => ipcRenderer.invoke('list-gotos', repositorySlugs),
  // Statistics
  getNoteStatistics: (repositorySlugs: string[], query: string, groupBy: string, value?: string) =>
    ipcRenderer.invoke('get-note-statistics', repositorySlugs, query, groupBy, value),
  countObjects: (repositorySlugs: string[]) => ipcRenderer.invoke('count-objects', repositorySlugs),
  getMediasDiskUsage: (repositorySlugs: string[]) =>
    ipcRenderer.invoke('get-medias-disk-usage', repositorySlugs),
  // Reminders and Memories
  getPendingReminders: (repositorySlugs: string[]) =>
    ipcRenderer.invoke('get-pending-reminders', repositorySlugs),
  getPastMemories: (repositorySlugs: string[]) =>
    ipcRenderer.invoke('get-past-memories', repositorySlugs),
  completeReminders: (reminderOids: string[]) =>
    ipcRenderer.invoke('complete-reminders', reminderOids),
  // Settings
  saveDynamicConfig: (dynamicConfig: EditorDynamicConfig) =>
    ipcRenderer.invoke('save-dynamic-config', dynamicConfig),
  // Flashcards
  listDecks: (repositorySlugs: string[]) => ipcRenderer.invoke('list-decks', repositorySlugs),
  listTodayFlashcards: (deckRef: DeckRef) => ipcRenderer.invoke('list-today-flashcards', deckRef),

  // Operations
  flushOperations: (repositorySlugs: string[]) =>
    ipcRenderer.invoke('flush-operations', repositorySlugs),
  reviewFlashcard: (deckRef: DeckRef, flashcard: Flashcard, review: Review) =>
    ipcRenderer.invoke('review-flashcard', deckRef, flashcard, review),

  // Hooks
  runHooks: (note: Note) => ipcRenderer.invoke('run-hooks', note),

  // Journal operations
  readNoteFile: (repositorySlug: string, filePath: string) =>
    ipcRenderer.invoke('read-note-file', repositorySlug, filePath),
  appendToFile: (repositorySlug: string, filePath: string, content: string) =>
    ipcRenderer.invoke('append-to-file', repositorySlug, filePath, content),
  determineJournalActivity: (repositorySlug: string, pathPrefix: string) =>
    ipcRenderer.invoke('determine-journal-activity', repositorySlug, pathPrefix),
  findJournalEntries: (repositorySlug: string, pathPrefix: string, start: string, end: string) =>
    ipcRenderer.invoke('find-journal-entries', repositorySlug, pathPrefix, start, end),
  forceAdd: (repositorySlug: string, filePath: string) =>
    ipcRenderer.invoke('force-add', repositorySlug, filePath)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
