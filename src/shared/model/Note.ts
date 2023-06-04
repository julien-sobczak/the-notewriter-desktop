export interface Note {
  oid: string;
  // File containing the note
  oidFile: string;
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
}
