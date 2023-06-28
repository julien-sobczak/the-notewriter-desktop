import { Note } from './Note';

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
