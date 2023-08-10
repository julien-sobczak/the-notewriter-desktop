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
  query: string | null; // for container blocks
  view: string | null; // single | grid | list | free
  // Percentage of this block on parent size (height for vertical, width for horizontal)
  size: string | null;
  elements: Block[] | null; // for horizontal/vertical blocks
}

export interface Desk {
  id: string;
  // Name of the desk
  name: string;
  // Workspaces to use by default on queries
  workspaces: string[];
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
