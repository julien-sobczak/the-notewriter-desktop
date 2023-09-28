export interface Workspace {
  name: string;
  slug: string;
  path: string;
  selected: boolean | null;
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

export interface NoteRef {
  id: string;
  workspace: string;
}

export interface Desk {
  id: string;
  // Name of the desk
  name: string;
  // Layout
  root: Block;
}

export interface DailyQuote {
  query: string;
  workspaces: string[];
}

export interface InspirationCategory {
  name: string;
  workspaces: string[];
  query: string;
}

export interface Inspiration {
  dailyQuote: DailyQuote | null;
  categories: InspirationCategory[];
}

export interface EditorStaticConfig {
  workspaces: Workspace[];
  inspirations: Inspiration | null;
}

export interface EditorDynamicConfig {
  desks: Desk[];
}

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
  source_oid: string;
  source_kind: string;
  target_oid: string;
  target_kind: string;
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
}

export interface QueryResult {
  query: Query;
  notes: Note[];
}

export interface File {
  workspacePath: string;
  relativePath: string;
  countNotes: number;
}

export interface FilesResult {
  workspaceSlug: string;
  files: File[];
}