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
