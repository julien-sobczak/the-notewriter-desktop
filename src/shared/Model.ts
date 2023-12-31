/* Config */

export interface EditorStaticConfig {
  workspaces: Workspace[];
  dailyQuote?: DailyQuoteConfig;
  inspirations?: InspirationConfig[];
  zenMode?: ZenConfig;
  study?: StudyConfig;
}

export interface Workspace {
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

export interface StudyConfig {
  decks: Deck[];
}

export interface Deck {
  name: string;
  query: string;
  workspaces?: string[];
  // TODO add SRS-algorithm parameters
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

/* UI Model */

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
