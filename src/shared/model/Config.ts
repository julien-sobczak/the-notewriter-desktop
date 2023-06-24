export interface Workspace {
  name: string;
  slug: string;
  path: string;
  selected: boolean;
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

export interface EditorStaticConfig {
  workspaces: Workspace[];
}

export interface EditorDynamicConfig {
  desks: Desk[];
}
