import { ElectronAPI } from '@electron-toolkit/preload'
import {
  DeckRef,
  EditorConfig,
  Flashcard,
  Note,
  NoteRef,
  File,
  Query,
  Review,
  JournalConfigWithContext,
  StatConfigWithContext,
  DeskWithContext,
  RepositoryQuery
} from '../main/Model'
import { CommandExecution, JournalActivity, QueryResult } from '@renderer/Model'

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
  selectDirectory: () => Promise<string | null>
  find: (noteRef: NoteRef) => Promise<Note>
  mfind: (noteRefs: NoteRef[]) => Promise<Note[]>
  findByWikilink: (repositorySlug: string, wikilink: string) => Promise<Note>
  search: (query: Query) => Promise<QueryResult>
  msearch: (queries: Query[]) => Promise<QueryResult[]>
  listNotesInFile: (repositorySlug: string, filePath: string) => Promise<Note[]>
  listFiles: (repositorySlug: string) => Promise<File[]>
  listGotos: (repositorySlugs: string[]) => Promise<Goto[]>
  getNoteStatistics: (
    repositorySlugs: string[],
    query: string,
    groupBy: string,
    value?: string
  ) => Promise<[string, number][]>
  countObjects: (repositorySlugs: string[]) => Promise<Map<string, number>>
  getMediasDiskUsage: (repositorySlugs: string[]) => Promise<MediaDirStat[]>
  getPendingReminders: (repositorySlugs: string[]) => Promise<Reminder[]>
  getPastMemories: (repositorySlugs: string[]) => Promise<Memory[]>
  completeReminders: (reminderOids: string[]) => Promise<void>
  saveDynamicConfig: (editorConfig: EditorConfig) => Promise<void>
  listDecks: (repositorySlugs: string[]) => Promise<Deck[]>
  listTodayFlashcards: (deckRef: DeckRef) => Promise<Flashcard[]>
  flushOperations: (repositorySlugs: string[]) => Promise<void>
  reviewFlashcard: (deckRef: DeckRef, flashcard: Flashcard, review: Review) => Promise<Flashcard>
  runHooks: (note: Note) => Promise<CommandExecution>
  readNoteFile: (repositorySlug: string, filePath: string) => Promise<string>
  appendToFile: (repositorySlug: string, filePath: string, content: string) => Promise<boolean>
  determineJournalActivity: (repositorySlug: string, pathPrefix: string) => Promise<JournalActivity>
  findJournalEntries: (
    repositorySlug: string,
    pathPrefix: string,
    start: string,
    end: string
  ) => Promise<ParentNote[]>
  forceAdd: (repositorySlug: string, filePath: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
