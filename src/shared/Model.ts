/* Config */

export interface EditorStaticConfig {
  workspaces: WorkspaceConfig[];
  dailyQuote?: DailyQuoteConfig;
  inspirations?: InspirationConfig[];
  zenMode?: ZenConfig;
}

export interface WorkspaceConfig {
  name: string;
  slug: string;
  path: string;
  selected?: boolean;
}

export interface DailyQuoteConfig {
  query: string;
  workspaces: string[];
}

export interface InspirationConfig {
  name: string;
  workspaces: string[];
  query: string;
}

export interface ZenConfig {
  queries: ZenQuery[];
}

export interface ZenQuery {
  query: string;
  workspaces?: string[];
}

/* Dynamic Config */

export interface EditorDynamicConfig {
  bookmarks?: Bookmark[];
  desks?: Desk[];
}

export interface Bookmark {
  // Identify the note
  workspaceSlug: string;
  noteOID: string;
  // Copy some attributes to make easy to list favorites and jump to to them
  noteKind: string;
  noteTitle: string;
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
  workspaces: string[]; // Workspaces to use by default on queries (recursively)
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

// .nt/config
export interface CollectionConfig {
  core: CoreConfig | null;
  deck: { [key: string]: DeckConfig };
  search: { [key: string]: SearchConfig };
}
export interface CoreConfig {
  extensions: string[];
  maxObjectsPerPackFile: number;
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
  q: string;
  name: string;
}

/* API */

export interface Deck {
  workspaceSlug: string;
  key: string;
  config: DeckConfig;
  stats: StatsDeck;
}
export interface StatsDeck {
  due: number;
  new: number;
}
export interface DeckRef {
  workspaceSlug: string;
  key: string;
  name: string;
}

/* UI Model */

export interface Flashcard {
  // Flashcards are related to their note and many attributes or properties on the note
  // are interesting when working with a flashcard. (ex: the note line to edit)

  oid: string;
  oidFile: string;
  oidNote: string;

  // Note-specific attributes
  noteRelativePath: string;
  noteLine: number;
  noteShortTitle: string;
  noteTags: string[];
  noteAttributes: { [name: string]: any };

  // Content in HTML
  front: string;
  back: string;

  // SRS
  dueAt: string; // ISO Format (TODO use type Date instead?), empty if never studied
  studiedAt: string; // ISO Format (TODO use type Date instead?), empty if never studied
  settings: { [name: string]: any };
}

export interface NoteRef {
  oid: string;
  workspaceSlug: string;
}

export interface Statistics {
  // Count of notes according the nationality of the author
  countNotesPerNationality: Map<string, number>;

  // Count of notes by kind
  countNotesPerKind: Map<string, number>;
}

/* DB Model */

export interface Blob {
  oid: string;
  mime: string;
  tags: string[];
}

export interface Media {
  oid: string;
  kind: string;
  blobs: Blob[];
}

export interface Note {
  oid: string;
  // File containing the note
  oidFile: string;

  // Enriched information about the workspace where the note comes from
  workspaceSlug: string;
  workspacePath: string;

  // Type of note: free, reference, ...
  kind: string;

  // The relative path of the file containing the note (denormalized field)
  relativePath: string;
  // The full wikilink to this note
  wikilink: string;

  // Merged attributes in JSON
  attributes: { [name: string]: any };

  // Merged tags in a comma-separated list
  tags: string[];

  // Line number (1-based index) of the note section title
  line: number;

  // Long title in HTML format
  title: string;
  // Content in HTML format
  content: string;
  // Content in HTML format
  comment: string;

  // Medias/Blobs referenced by the note
  medias: Media[];
}

export interface Relation {
  sourceOID: string;
  sourceKind: string;
  targetOID: string;
  targetKind: string;
  relationType: string;
}

export interface Query {
  // The raw query string
  q: string;
  // The selected workspaces
  workspaces: string[];
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

export interface File {
  oid: string;
  workspaceSlug: string;
  workspacePath: string;
  relativePath: string;
  countNotes: number;
}

export interface Study {
  oid: string;
  startedAt: string;
  endedAt: string;
  reviews: Review[];
}

export interface Review {
  flashcardOID: string;
  feedback: string; // easy | good | again | hard | too-easy | too-hard
  durationInMs: number;
  completedAt: string;
  dueAt: string;
  settings: { [key: string]: any };
}

export interface CommitGraph {
  updatedAt: string;
  commits: Commit[];
}
export interface Commit {
  oid: string;
  ctime: string;
  mtime: string;
  packFiles: PackFileRef[];
}
export interface PackFileRef {
  oid: string;
  ctime: string;
  mtime: string;
}
export interface PackFile {
  oid: string;
  ctime: string;
  mtime: string;
  packObjects: PackObject[];
}
export interface PackObject {
  oid: string;
  kind: string;
  state: string;
  mtime: string;
  description: string;
  data: string;
}
