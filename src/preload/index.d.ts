import { ElectronAPI } from '@electron-toolkit/preload'
import {
  DeckRef,
  EditorDynamicConfig,
  Flashcard,
  Note,
  NoteRef,
  Query,
  Review
} from '../main/Model'

interface API {
  // Environment variables
  env: {
    NT_SKIP_DAILY_QUOTE: string | undefined
  }

  // Main to renderer callbacks
  onConfigurationLoaded: (callback: (value: any) => void) => void
  onClean: (callback: (value: any) => void) => void
  onWindowIsClosing: (callback: (value: any) => void) => void

  // 1-way renderer to main
  edit: (repositorySlug: string, filePath: string, line: number) => void
  browseUrl: (url: string) => void

  // 2-way renderer to main
  getDailyQuote: () => Promise<any>
  find: (noteRef: NoteRef) => Promise<Note>
  mfind: (noteRefs: NoteRef[]) => Promise<Note[]>
  findByWikilink: (repositorySlug: string, wikilink: string) => Promise<Note>
  search: (query: Query) => Promise<any>
  msearch: (queries: Query[]) => Promise<any>
  listNotesInFile: (repositorySlug: string, filePath: string) => Promise<any>
  listFiles: (repositorySlug: string) => Promise<any>
  listGotos: (repositorySlugs: string[]) => Promise<any>
  getStatistics: (repositorySlugs: string[]) => Promise<any>
  getPendingReminders: (repositorySlugs: string[]) => Promise<any>
  getPastMemories: (repositorySlugs: string[]) => Promise<any>
  completeReminders: (reminderOids: string[]) => Promise<any>
  getRepositoryConfig: (repositorySlug: string) => Promise<any>
  saveDynamicConfig: (dynamicConfig: EditorDynamicConfig) => Promise<any>
  listDecks: (repositorySlugs: string[]) => Promise<any>
  listTodayFlashcards: (deckRef: DeckRef) => Promise<any>
  flushOperations: (repositorySlugs: string[]) => Promise<any>
  reviewFlashcard: (deckRef: DeckRef, flashcard: Flashcard, review: Review) => Promise<any>
  runHooks: (note: Note) => Promise<any>
  readNoteFile: (repositorySlug: string, filePath: string) => Promise<any>
  appendToFile: (repositorySlug: string, filePath: string, content: string) => Promise<any>
  determineJournalActivity: (repositorySlug: string, pathPrefix: string) => Promise<any>
  findJournalEntries: (
    repositorySlug: string,
    pathPrefix: string,
    start: string,
    end: string
  ) => Promise<any>
  forceAdd: (repositorySlug: string, filePath: string) => Promise<any>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
