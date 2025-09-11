/* Config */

/* Static Config */
/* editorconfig.yml */

// TODO use repositorySlugs instead of repositories to be consistent

export interface EditorStaticConfig {
  repositories: RepositoryRefConfig[];
  dailyQuote?: DailyQuoteConfig;
  inspirations?: InspirationConfig[];
  zenMode?: ZenConfig;
}

export interface RepositoryRefConfig {
  name: string;
  slug: string;
  path: string;
  selected?: boolean;
}

export interface DailyQuoteConfig {
  query: string;
  repositories: string[];
}

export interface InspirationConfig {
  name: string;
  repositories: string[];
  query: string;
}

export interface ZenConfig {
  queries: ZenQuery[];
}

export interface ZenQuery {
  query: string;
  repositories?: string[];
}

/* Dynamic Config */
/* editorconfig.json */

export interface EditorDynamicConfig {
  bookmarks?: Bookmark[];
  desks?: Desk[];
}

export interface Bookmark {
  // Identify the note
  repositorySlug: string;
  noteOID: string;
  // Copy some attributes to make easy to list favorites and jump to them
  noteType: string;
  noteLongTitle: string;
  noteRelativePath: string;
  noteLine: number;
}

export interface Desk {
  id: string;
  // Name of the desk
  name: string;
  // Layout
  root: Block;
}

export interface Block {
  // Unique identifier inside a single desk
  id: string;
  name: string | null;
  layout: string; // container | horizontal | vertical
  repositories: string[]; // Repositories to use by default on queries (recursively)
  view: string | null; // single | grid | list | free
  // Percentage of this block on parent size (height for vertical, width for horizontal)
  size: string | null;

  // Layout-specific attributes

  // for horizontal/vertical blocks
  elements: Block[] | null;

  // for container blocks
  query: string | null;
  noteRefs: NoteRef[];
}

/* The NoteWriter Config */
/* .nt/.config.json */

export interface RepositoryConfig {
  core: CoreConfig | null;
  attributes: { [key: string]: AttributeConfig };
  types: { [key: string]: TypeConfig };
  decks: DeckConfig[];
  searches: { [key: string]: SearchConfig };
  // Ignore linter and references sections
}
export interface CoreConfig {
  extensions: string[];
  // Ignore media section
}
export interface AttributeConfig {
  name: string;
  aliases: string[];
  type: string;
  format: string;
  min: number;
  max: number;
  pattern: string;
  inherit: boolean | null;
  allowedValues: string[];
  shorthands: { [key: string]: any };
  preserveShorthand?: boolean;
  defaultValue?: any;
}
export interface TypeConfig {
  name: string;
  pattern: string;
  preprocessors: string[];
  attributes: TypeAttributeConfig[];
}
export interface TypeAttributeConfig {
  name: string;
  required?: boolean;
  inline?: boolean;
}
export interface DeckConfig {
  name: string;
  query: string;
  boostFactor: number;
  newFlashcardsPerDay: number;
  maxFlashcardsPerDay: number;
  algorithm: string;
  algorithmSettings: { [key: string]: any };
}
export interface SearchConfig {
  title: string;
  q: string;
}

/* API */

export interface Deck {
  repositorySlug: string;
  name: string;
  config: DeckConfig;
  stats: StatsDeck;
}
export interface StatsDeck {
  due: number;
  new: number;
}
export interface DeckRef {
  repositorySlug: string;
  name: string;
}

/* UI Model */

export interface NoteRef {
  oid: string;
  repositorySlug: string;
}

export interface Statistics {
  // Count of notes according the nationality of the author
  countNotesPerNationality: Map<string, number>;

  // Count of notes by type
  countNotesPerType: Map<string, number>;
}

export interface Query {
  // The raw query string
  q: string;
  // The selected repositories
  repositories: string[];
  // The desk where the query originated
  deskId: string | null | undefined;
  // The block where the query originated
  blockId: string | null | undefined;
  limit: number; // Use 0 to not limit
  shuffle: boolean;
}

export interface QueryResult {
  query: Query;
  notes: Note[];
}

/* DB Model */

export interface Blob {
  oid: string;
  mimeType: string;
  attributes: { [name: string]: any };
  tags: string[];
}

export interface Media {
  oid: string;
  relativePath: string;
  kind: string;
  extension: string;
  blobs: Blob[];
}

export interface Note {
  oid: string;
  // File containing the note
  oidFile: string;

  slug: string;

  // Enriched information about the repository where the note comes from
  repositorySlug: string;
  repositoryPath: string;

  // Type of note: free, reference, ...
  type: string;

  // Titles in Markdown
  title: string;
  longTitle: string;
  shortTitle: string;

  // The relative path of the file containing the note (denormalized field)
  relativePath: string;
  // The full wikilink to this note
  wikilink: string;

  // Attributes
  attributes: { [name: string]: any };
  // Tags
  tags: string[];

  // Line number (1-based index) of the note section title
  line: number;

  // Content (Markdown)
  content: string;
  // Body of the note, without the title and block attributes
  body: string;
  // Comment (Markdown)
  comment: string;

  // Optional items (for list notes)
  items?: Items;

  marked: boolean;
  annotations: Annotation[];

  // Medias/Blobs referenced by the note
  medias: Media[];
}

export interface Items {
  children: ListItem[];
  attributes: string[];
  tags: string[];
  emojis: string[];
}

export interface ListItem {
  line: number;
  text: string;
  attributes: { [name: string]: any };
  tags: string[];
  emojis: string[];
  children?: ListItem[];
}

export interface Annotation {
  oid: string;
  text: string;
}

export interface Flashcard {
  // Flashcards are related to their note and many attributes or properties on the note
  // are interesting when working with a flashcard. (ex: the note line to edit)

  oid: string;
  oidFile: string;
  oidNote: string;

  // Note-specific attributes
  relativePath: string;
  shortTitle: string;
  tags: string[];
  attributes: { [name: string]: string };

  // Content in Markdown
  front: string;
  back: string;

  // SRS
  dueAt: string; // ISO Format (TODO use type Date instead?), empty if never studied
  studiedAt: string; // ISO Format (TODO use type Date instead?), empty if never studied
  settings: { [name: string]: any };
}

export interface Relation {
  sourceOID: string;
  sourceKind: string;
  targetOID: string;
  targetKind: string;
  relationType: string;
}

export interface File {
  oid: string;
  slug: string;

  repositorySlug: string;
  repositoryPath: string;

  relativePath: string;
  wikilink: string;
  // Titles in Markdown
  title: string;
  shortTitle: string;
}

export interface Goto {
  oid: string;
  oidNote: string;
  relativePath: string;
  text: string; // in Markdown
  url: string;
  title?: string; // Optional title for the link
  name: string;
}

export interface Study {
  // TODO still useful?
  oid: string;
  startedAt: string;
  endedAt: string;
  reviews: Review[];
}

export interface Review {
  // TODO update?
  flashcardOID: string;
  feedback: string; // easy | good | again | hard | too-easy | too-hard
  durationInMs: number;
  completedAt: string;
  dueAt: string;
  settings: { [key: string]: any };
}

export interface PackFileRef {
  oid: string;
  ctime: string;
}
export interface PackFile {
  oid: string;
  file_mtime: string;
  file_size: number;
  ctime: string;
  objects: PackObject[];
  blobs: Blob[];
}
export interface PackObject {
  oid: string;
  kind: string;
  ctime: string;
  description: string;
  data: string;
}

export interface Operation {
  oid: string;
  object_oid: string;
  name: string;
  timestamp: string; // ISO format
  extras: { [key: string]: any };
}

export interface CommandExecution {
  exitCode: number;
  duration: number; // in milliseconds
  stdout: string;
  stderr: string;
}

/* Utils */

// Get the attribute for a given name in the repository configuration
export function getAttributeConfig(
  repositoryConfig: RepositoryConfig,
  name: string,
): AttributeConfig {
  const attr = repositoryConfig?.attributes?.[name] ?? {
    name,
    aliases: [],
    type: 'string', // Default to string
    format: '',
    min: 0,
    max: 0,
    pattern: '',
    inherit: null, // Default to no inheritance
  };
  return attr;
}

// Extract the source link from a note attributes
export function extractSourceURL(note: Note): string | undefined {
  // Search in attributes for a `source` attribute containing an HTTP(s) URL and return it.
  // Ex: https://example.com/resource must be returned as a string.
  // Ex: [Alt](https://example.com/resource "Title") must return only the URL.
  for (const [key, value] of Object.entries(note.attributes)) {
    if (key === 'source' && typeof value === 'string') {
      // Extract the first HTTP(S) URL from the string
      const match = value.match(/https?:\/\/[^\s)"]+/);
      if (match) {
        return match[0];
      }
    }
  }
  return undefined;
}
