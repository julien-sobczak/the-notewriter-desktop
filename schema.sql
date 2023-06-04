
CREATE TABLE note (
  oid TEXT PRIMARY KEY,

  -- File containing the note
  file_oid TEXT NOT NULL,

  -- Optional parent note containing the note
  note_oid TEXT,

  -- Type of note: free, reference, ...
  kind TEXT NOT NULL,

  -- The relative path of the file containing the note (denormalized field)
  relative_path TEXT NOT NULL,
  -- The full wikilink to this note
  wikilink TEXT NOT NULL,

  -- Title including the kind but not the Markdown heading characters
  title TEXT NOT NULL,
  -- Same as short_title prefix by parent note/file's short titles.
  long_title TEXT NOT NULL,
  -- Same as title without the kind
  short_title TEXT NOT NULL,

  -- Merged attributes in JSON
  attributes TEXT NOT NULL,

  -- Merged tags in a comma-separated list
  tags TEXT NOT NULL,

  -- Line number (1-based index) of the note section title
  "line" INTEGER NOT NULL,

  -- Content without post-prcessing (including tags, attributes, ...)
  content_raw TEXT NOT NULL,
  -- Hash of content_raw
  hashsum TEXT NOT NULL,
  -- Long title in Markdown format (best for editing)
  title_markdown TEXT NOT NULL,
  -- Long title in HTML format (best for rendering)
  title_html TEXT NOT NULL,
  -- Long title in text format (best for indexing)
  title_text TEXT NOT NULL,
  -- Content in Markdown format (best for editing)
  content_markdown TEXT NOT NULL,
  -- Content in HTML format (best for rendering)
  content_html TEXT NOT NULL,
  -- Content in text format (best for indexing)
  content_text TEXT NOT NULL,
  -- Comment in Markdown format
  comment_markdown TEXT NOT NULL,
  -- Content in HTML format
  comment_html TEXT NOT NULL,
  -- Content in text format
  comment_text TEXT NOT NULL,

  -- Timestamps to track changes
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_checked_at TEXT
);

CREATE VIRTUAL TABLE note_fts USING FTS5(oid UNINDEXED, kind UNINDEXED, short_title, content_text, content='note', content_rowid='rowid');
