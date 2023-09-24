export interface Workspace {
  name: string;
  slug: string;
  path: string;
  selected: boolean | null;
}

export interface Block {
  // Unique identifier inside a single desk
  id: string;
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
