export interface Workspace {
  name: string;
  slug: string;
  path: string;
  selected: boolean;
}

export interface EditorConfig {
  workspaces: Workspace[];
}
