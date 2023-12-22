import { Database, verbose as sqlite3Verbose } from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { normalizePath } from './util';
import * as Model from '../shared/Model';

sqlite3Verbose();

// See for async/await https://github.com/danielsomerfield/function-first-composition-example-typescript/blob/main/test/domainTestingHelpers.ts

function randomElement(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}

// Extract medias OIDs from a single note
function extractMediaOIDs(note: Model.Note): string[] {
  const results: string[] = [];

  const re: RegExp = /<media oid="([a-zA-Z0-9]{40})"/g;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    m = re.exec(note.content);
    if (m == null) {
      break;
    }
    results.push(m[1]);
  }

  return results;
}

export default class DatabaseManager {
  workspaces: Map<string, Model.WorkspaceConfig>;

  // List of datasources based on workspaces defined in global configuration
  datasources: Map<string, Database>;

  datasourcesPaths: Map<string, string>;

  constructor() {
    this.workspaces = new Map();
    this.datasources = new Map<string, Database>();
    this.datasourcesPaths = new Map<string, string>();
  }

  close(): void {
    this.datasources.forEach((db, name) => {
      console.debug(`Closing datasource ${name}`);
      db.close();
    });
  }

  registerWorkspace(workspace: Model.WorkspaceConfig): this {
    this.workspaces.set(workspace.slug, workspace);

    const workspacePath = normalizePath(workspace.path);
    const dbPath = path.join(workspacePath, '.nt/database.db');
    if (fs.existsSync(dbPath)) {
      console.debug(`Using database ${dbPath}`);
      const db = new Database(dbPath);
      this.datasources.set(workspace.slug, db);
      this.datasourcesPaths.set(workspace.slug, workspacePath);
    } else {
      throw new Error(`Missing database ${dbPath}`);
    }

    return this;
  }

  // Returns the absolute for to the workspace root directory from its slug name.
  #getWorkspacePath(slug: string): string {
    const absolutePath = this.datasourcesPaths.get(slug);
    if (!absolutePath) {
      throw new Error(`missing path for workspace ${slug}`);
    }
    return absolutePath;
  }

  async searchMedias(
    oids: string[],
    datasourceName: string
  ): Promise<Model.Media[]> {
    // Nothing to search
    if (oids.length === 0) {
      return new Promise<Model.Media[]>((resolve) => {
        resolve([]);
      });
    }

    const db = this.datasources.get(datasourceName);
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`);
    }
    return new Promise<Model.Media[]>((resolve, reject) => {
      const sqlOids = `'${oids.join("','")}'`;
      const sqlQuery = `
        SELECT m.oid, m.kind, b.oid as blobOid, b.mime as blobMime, b.tags as blobTags
        FROM media m JOIN blob b on m.oid = b.media_oid
        WHERE m.dangling = 0 AND m.oid IN (${sqlOids})
      `;
      console.log(sqlQuery); // FIXME remove
      db.all(sqlQuery, async (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for medias', err);
          reject(err);
          return;
        }

        const medias: Model.Media[] = [];
        let lastMediaOid: string | undefined;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          let blobTags = [];
          if (rows.blobTags !== '') blobTags = row.blobTags.split(',');
          if (lastMediaOid === row.oid) {
            medias[medias.length - 1].blobs.push({
              oid: row.blobOid,
              mime: row.blobMime,
              tags: blobTags,
            });
          } else {
            lastMediaOid = row.oid;
            medias.push({
              oid: row.oid,
              kind: row.kind,
              blobs: [
                {
                  oid: row.blobOid,
                  mime: row.blobMime,
                  tags: blobTags,
                },
              ],
            });
          }
        }
        resolve(medias);
      });
    });
  }

  async searchNotes(
    q: string,
    datasourceName: string,
    limit: number,
    shuffle: boolean
  ): Promise<Model.Note[]> {
    const db = this.datasources.get(datasourceName);
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`);
    }
    return new Promise<Model.Note[]>((resolve, reject) => {
      const sqlQuery = query2sql(q, limit, shuffle);
      console.debug(`[${datasourceName}] ${sqlQuery}`);
      db.all(sqlQuery, async (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for notes', err);
          reject(err);
          return;
        }

        const notes: Model.Note[] = []; // The found notes
        const mediaOIDs: string[] = []; // The list of all medias found
        const notesMediaOIDs = new Map<string, string[]>(); // The mapping of note <-> medias

        // Iterate over found notes and search for potential referenced medias
        for (let i = 0; i < rows.length; i++) {
          const note = this.#rowToNote(rows[i], datasourceName);
          const noteMediaOIDs = extractMediaOIDs(note);
          notesMediaOIDs.set(note.oid, noteMediaOIDs);
          mediaOIDs.push(...noteMediaOIDs);
          notes.push(note);
        }

        // Search for medias
        const foundMedias = await this.searchMedias(mediaOIDs, datasourceName);
        console.log(
          `Found ${notes.length} notes, ${foundMedias.length} medias`
        );
        const mediasByOids = new Map<string, Model.Media>();
        foundMedias.forEach((media) => mediasByOids.set(media.oid, media));

        // Append found medias on notes
        for (let i = 0; i < notes.length; i++) {
          const note = notes[i];
          if (!notesMediaOIDs.has(note.oid)) {
            // No medias for this note
            continue;
          }

          const referencedMediaOids = notesMediaOIDs.get(note.oid);
          referencedMediaOids?.forEach((mediaOid) => {
            const media = mediasByOids.get(mediaOid);
            if (media) {
              note.medias.push(media);
            }
          });
        }
        resolve(notes);
      });
    });
  }

  async countNotesPerNationality(
    workspaceSlugs: string[]
  ): Promise<Map<string, number>> {
    const workspaceResults: Promise<Map<string, number>>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        workspaceSlugs.length === 0 ||
        workspaceSlugs.includes(datasourceName)
      ) {
        const db = this.datasources.get(datasourceName);
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`);
        }

        workspaceResults.push(
          new Promise<Map<string, number>>((resolve, reject) => {
            db.all(
              `
                SELECT tt.value as nationality, count(*) as count_notes FROM (
                  SELECT j.key AS attribute, j.value
                  FROM note t, json_each(t.attributes) j
                  WHERE j.key = "nationality"
                ) AS tt
                GROUP BY tt.value
              `,
              (err: any, rows: any) => {
                if (err) {
                  console.log(
                    'Error while searching for statistics about nationalities',
                    err
                  );
                  reject(err);
                } else {
                  const result: Map<string, number> = new Map();
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const nationality = row.nationality;
                    const count = row.count_notes;
                    result.set(nationality, count);
                  }
                  resolve(result);
                }
              }
            );
          })
        );
      }
    }

    return Promise.all(workspaceResults).then((allWorkspaceResults) => {
      return new Promise<Map<string, number>>((resolve) => {
        const result: Map<string, number> = new Map();
        for (const workspaceResult of allWorkspaceResults) {
          for (const [key, value] of workspaceResult) {
            if (!result.has(key)) {
              result.set(key, 0);
            }
            const prevValue = result.get(key) || 0;
            result.set(key, prevValue + value);
          }
        }
        resolve(result);
      });
    });
  }

  async countNotesPerKind(
    workspaceSlugs: string[]
  ): Promise<Map<string, number>> {
    const workspaceResults: Promise<Map<string, number>>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        workspaceSlugs.length === 0 ||
        workspaceSlugs.includes(datasourceName)
      ) {
        const db = this.datasources.get(datasourceName);
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`);
        }

        workspaceResults.push(
          new Promise<Map<string, number>>((resolve, reject) => {
            db.all(
              `
                SELECT n.kind as kind, count(*) as count_notes
                FROM note n
                GROUP BY n.kind
              `,
              (err: any, rows: any) => {
                if (err) {
                  console.log(
                    'Error while searching for statistics about kinds',
                    err
                  );
                  reject(err);
                } else {
                  const result: Map<string, number> = new Map();
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const kind = row.kind;
                    const count = row.count_notes;
                    result.set(kind, count);
                  }
                  resolve(result);
                }
              }
            );
          })
        );
      }
    }

    return Promise.all(workspaceResults).then((allWorkspaceResults) => {
      return new Promise<Map<string, number>>((resolve) => {
        const result: Map<string, number> = new Map();
        for (const workspaceResult of allWorkspaceResults) {
          for (const [key, value] of workspaceResult) {
            if (!result.has(key)) {
              result.set(key, 0);
            }
            const prevValue = result.get(key) || 0;
            result.set(key, prevValue + value);
          }
        }
        resolve(result);
      });
    });
  }

  async searchDailyQuote(query: Model.Query): Promise<Model.Note> {
    // Choose a datasource
    let selectedDatasourceName: string;
    if (!query.workspaces || query.workspaces.length === 0) {
      selectedDatasourceName = randomElement([...this.datasources.keys()]);
    } else if (query.workspaces.length === 1) {
      // eslint-disable-next-line prefer-destructuring
      selectedDatasourceName = query.workspaces[0];
    } else {
      selectedDatasourceName = randomElement(query.workspaces);
    }

    const db = this.datasources.get(selectedDatasourceName);
    if (!db) {
      throw new Error(`No datasource ${selectedDatasourceName} found`);
    }

    return new Promise<Model.Note>((resolve, reject) => {
      db.all(
        `
          SELECT
            oid,
            file_oid,
            kind,
            relative_path,
            wikilink,
            attributes,
            tags,
            line,
            title_html,
            content_html,
            comment_html
          FROM note
          WHERE kind = 'quote'
          ORDER BY RANDOM()
          LIMIT 1`,
        (err: any, rows: any) => {
          if (err) {
            console.log('Error while searching for daily quote', err);
            reject(err);
          } else {
            const note = this.#rowToNote(rows[0], selectedDatasourceName);
            resolve(note);
          }
        }
      );
    });
  }

  async find(noteRef: Model.NoteRef): Promise<Model.Note> {
    const datasourceName = noteRef.workspaceSlug;
    const db = this.datasources.get(datasourceName);
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`);
    }
    return new Promise<Model.Note>((resolve, reject) => {
      const sqlQuery = `
        SELECT
          oid,
          file_oid,
          kind,
          relative_path,
          wikilink,
          attributes,
          tags,
          line,
          title_html,
          content_html,
          comment_html
        FROM note
        WHERE oid = ?
      `;
      console.debug(`[${datasourceName}] ${sqlQuery}`);
      db.get(sqlQuery, [noteRef.oid], async (err: any, row: any) => {
        if (err) {
          console.log('Error while searching for note by id', err);
          reject(err);
          return;
        }

        const note = this.#rowToNote(row, datasourceName);
        const mediaOIDs = extractMediaOIDs(note);

        // Append found medias on note
        const foundMedias = await this.searchMedias(mediaOIDs, datasourceName);
        note.medias.push(...foundMedias);

        resolve(note);
      });
    });
  }

  async multiFind(noteRefs: Model.NoteRef[]): Promise<Model.Note[]> {
    // Nothing to search
    if (noteRefs.length === 0) {
      return new Promise<Model.Note[]>((resolve) => {
        resolve([]);
      });
    }

    // Group OID by datasource
    const oidByWorkspace = new Map<string, string[]>();
    for (const noteRef of noteRefs) {
      if (!oidByWorkspace.has(noteRef.workspaceSlug)) {
        oidByWorkspace.set(noteRef.workspaceSlug, []);
      }
      oidByWorkspace.get(noteRef.workspaceSlug)?.push(noteRef.oid);
    }

    // Trigger one query per datasource
    const results: Promise<Model.Note[]>[] = [];
    for (const [datasourceName, oids] of oidByWorkspace) {
      const db = this.datasources.get(datasourceName);
      if (!db) {
        throw new Error(`No datasource ${datasourceName} found`);
      }
      const result = new Promise<Model.Note[]>((resolve, reject) => {
        const sqlQuery = `
          SELECT
            oid,
            file_oid,
            kind,
            relative_path,
            wikilink,
            attributes,
            tags,
            line,
            title_html,
            content_html,
            comment_html
          FROM note
          WHERE oid IN ?
        `;
        console.debug(`[${datasourceName}] ${sqlQuery}`);
        db.all(sqlQuery, [oids], async (err: any, rows: any) => {
          if (err) {
            console.log('Error while searching for notes by id', err);
            reject(err);
            return;
          }

          const notes: Model.Note[] = []; // The found notes
          const mediaOIDs: string[] = []; // The list of all medias found
          const notesMediaOIDs = new Map<string, string[]>(); // The mapping of note <-> medias

          // Iterate over found notes and search for potential referenced medias
          for (let i = 0; i < rows.length; i++) {
            const note = this.#rowToNote(rows[i], datasourceName);
            const noteMediaOIDs = extractMediaOIDs(note);
            notesMediaOIDs.set(note.oid, noteMediaOIDs);
            mediaOIDs.push(...noteMediaOIDs);
            notes.push(note);
          }

          // Search for medias
          const foundMedias = await this.searchMedias(
            mediaOIDs,
            datasourceName
          );
          const mediasByOids = new Map<string, Model.Media>();
          foundMedias.forEach((media) => mediasByOids.set(media.oid, media));

          // Append found medias on notes
          for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (!notesMediaOIDs.has(note.oid)) {
              // No medias for this note
              continue;
            }

            console.log(`Have medias to append for note ${note.oid}`); // FIXME remove
            const referencedMediaOids = notesMediaOIDs.get(note.oid);
            referencedMediaOids?.forEach((mediaOid) => {
              const media = mediasByOids.get(mediaOid);
              if (media) {
                note.medias.push(media);
              }
            });
          }
          resolve(notes);
        });
      });

      results.push(result);
    }

    return Promise.all(results).then((allNotes) => {
      return new Promise<Model.Note[]>((resolve) => {
        let returnedNotes: Model.Note[] = [];
        for (const notes of allNotes) {
          returnedNotes = returnedNotes.concat(notes);
        }
        resolve(returnedNotes);
      });
    });
  }

  async search(query: Model.Query): Promise<Model.QueryResult> {
    const results: Promise<Model.Note[]>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        !query.workspaces ||
        query.workspaces.length === 0 ||
        query.workspaces.includes(datasourceName)
      ) {
        results.push(
          this.searchNotes(query.q, datasourceName, query.limit, query.shuffle)
        );
      }
    }

    return Promise.all(results).then((allNotes) => {
      return new Promise<Model.QueryResult>((resolve) => {
        let returnedNotes: Model.Note[] = [];
        for (const notes of allNotes) {
          returnedNotes = returnedNotes.concat(notes);
        }
        resolve({
          query,
          notes: returnedNotes,
        });
      });
    });
  }

  async multiSearch(queries: Model.Query[]): Promise<Model.QueryResult[]> {
    const results: Promise<Model.QueryResult>[] = [];
    for (const query of queries) {
      results.push(this.search(query));
    }

    return Promise.all(results).then((allResults) => {
      return new Promise<Model.QueryResult[]>((resolve) => {
        resolve(allResults);
      });
    });
  }

  /* Files Management */

  async listFiles(workspaceSlugs: string[]): Promise<Model.File[]> {
    const workspaceResults: Promise<Model.File[]>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        workspaceSlugs.length === 0 ||
        workspaceSlugs.includes(datasourceName)
      ) {
        const db = this.datasources.get(datasourceName);
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`);
        }

        workspaceResults.push(
          new Promise<Model.File[]>((resolve, reject) => {
            db.all(
              `
                SELECT
                  file.oid as oid,
                  note.relative_path as relative_path,
                  count(*) as count_notes
                FROM note JOIN file on note.file_oid = file.oid
                GROUP BY file.relative_path
                ORDER BY file.relative_path ASC`,
              (err: any, rows: any) => {
                if (err) {
                  console.log('Error while listing files in database', err);
                  reject(err);
                } else {
                  const files: Model.File[] = [];
                  for (const row of rows) {
                    files.push(this.#rowToFile(row, datasourceName));
                  }
                  resolve(files);
                }
              }
            );
          })
        );
      }
    }

    return Promise.all(workspaceResults).then((allWorkspaceResults) => {
      return new Promise<Model.File[]>((resolve) => {
        const result: Model.File[] = [];
        for (const workspaceResult of allWorkspaceResults) {
          result.push(...workspaceResult);
        }
        resolve(result);
      });
    });
  }

  async listNotesInFile(
    workspaceSlug: string,
    relativePath: string
  ): Promise<Model.Note[]> {
    return this.searchNotes(`path:${relativePath}`, workspaceSlug, 0, false);
  }

  /* Deck Management */

  async getDeckStats(
    workspaceSlug: string,
    deckConfig: Model.DeckConfig
  ): Promise<Model.StatsDeck> {
    const db = this.datasources.get(workspaceSlug);
    if (!db) {
      throw new Error(`No datasource ${workspaceSlug} found`);
    }

    return new Promise<Model.StatsDeck>((resolve, reject) => {
      let sql = `
        SELECT
          COUNT(CASE WHEN flashcard.due_at IS NOT '' AND flashcard.due_at < '?' THEN 1 END) as count_due,
          COUNT(CASE WHEN flashcard.due_at IS NULL OR flashcard.due_at = '' THEN 1 END) as count_new
        FROM note_fts JOIN note on note.oid = note_fts.oid
        JOIN flashcard on flashcard.note_oid = note.oid WHERE note.kind='flashcard' AND `;
      const whereContent = queryPart2sql(deckConfig.query);
      if (whereContent) {
        sql += ` AND ${whereContent}`;
      }
      sql += ';';

      db.get(sql, calculateDueDate(), (err: any, row: any) => {
        if (err) {
          console.log('Error while searching for due flashcards', err);
          reject(err);
        } else {
          resolve({
            due: row.count_due,
            new: row.count_new,
          });
        }
      });
    });
  }

  async getTodayFlashcards(
    workspaceSlug: string,
    deckConfig: Model.DeckConfig
  ): Promise<Model.Flashcard[]> {
    const db = this.datasources.get(workspaceSlug);
    if (!db) {
      throw new Error(`No datasource ${workspaceSlug} found`);
    }

    return new Promise<Model.Flashcard[]>((resolve, reject) => {
      const sql = `
        SELECT
          flashcard.oid,
          flashcard.file_oid,
          flashcard.note_oid,
          note.relative_path,
          note.line,
          note.short_title,
          note.tags,
          note.attributes,
          flashcard.front_html,
          flashcard.back_html,
          flashcard.due_at,
          flashcard.studied_at,
          flashcard.settings
        FROM note_fts JOIN note on note.oid = note_fts.oid
        JOIN flashcard on flashcard.note_oid = note.oid
        WHERE note.kind='flashcard'
        AND flashcard.due_at IS NOT '' AND flashcard.due_at < '${calculateDueDate()}'
        AND ${queryPart2sql(deckConfig.query)}

        UNION

        SELECT
          flashcard.oid,
          flashcard.file_oid,
          flashcard.note_oid,
          note.relative_path,
          note.line,
          note.short_title,
          note.tags,
          note.attributes,
          flashcard.front_html,
          flashcard.back_html,
          flashcard.due_at,
          flashcard.studied_at,
          flashcard.settings
        FROM note_fts JOIN note on note.oid = note_fts.oid
        JOIN flashcard on flashcard.note_oid = note.oid
        WHERE note.kind='flashcard'
        AND flashcard.due_at IS NULL OR flashcard.due_at = ''
        AND ${queryPart2sql(deckConfig.query)}
        `;

      db.all(sql, calculateDueDate(), (err: any, rows: any[]) => {
        if (err) {
          console.log('Error while searching for due flashcards', err);
          reject(err);
          return;
        }

        const results: Model.Flashcard[] = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const flashcard: Model.Flashcard = {
            oid: row.oid,
            oidFile: row.file_oid,
            oidNote: row.note_oid,
            noteRelativePath: row.relative_path,
            noteLine: row.line,
            noteShortTitle: row.short_title,
            noteTags: row.tags.split(','),
            noteAttributes: JSON.parse(row.attributes),
            front: row.front_html,
            back: row.back_html,
            dueAt: row.due_at,
            studiedAt: row.studied_at,
            settings: JSON.parse(row.settings),
          };
          results.push(flashcard);
        }
        resolve(results);
      });
    });
  }

  async updateFlashcard(
    workspaceSlug: string,
    deckConfig: Model.DeckConfig,
    flashcard: Model.Flashcard
  ): Promise<Model.Flashcard> {
    const db = this.datasources.get(workspaceSlug);
    if (!db) {
      throw new Error(`No datasource ${workspaceSlug} found`);
    }

    return new Promise<Model.Flashcard>((resolve, reject) => {
      // The NoteWriter Desktop only updates SRS fields.
      const data = [
        flashcard.dueAt,
        flashcard.studiedAt,
        JSON.stringify(flashcard.settings),
        flashcard.oid,
      ];
      const sql = `UPDATE flashcard
                  SET
                    due_at = ?,
                    studied_at = ?,
                    settings = ?
                  WHERE oid = ?`;
      db.run(sql, data, (err: any) => {
        if (err) {
          console.log('Error while searching for due flashcards', err);
          reject(err);
        } else {
          resolve(flashcard);
        }
      });
    });
  }

  /* Converters */

  #rowToFile(row: any, workspaceSlug: string): Model.File {
    return {
      oid: row.oid,
      workspaceSlug,
      workspacePath: this.#getWorkspacePath(workspaceSlug),
      relativePath: row.relative_path,
      countNotes: row.count_notes,
    };
  }

  #rowToNote(row: any, workspaceSlug: string): Model.Note {
    let parsedTags = [];
    if (row.tags !== '') parsedTags = row.tags.split(',');
    return {
      oid: row.oid,
      oidFile: row.file_oid,
      workspaceSlug,
      workspacePath: this.#getWorkspacePath(workspaceSlug),
      kind: row.kind,
      relativePath: row.relative_path,
      wikilink: row.wikilink,
      attributes: JSON.parse(row.attributes),
      tags: parsedTags,
      line: row.line,
      title: row.title_html,
      content: row.content_html,
      comment: row.comment_html,
      medias: [],
    };
  }
}

/* Parsing */

// eslint-disable-next-line import/prefer-default-export
export function readStringValue(q: string): [string, string] {
  const firstCharacter = q.charAt(0);

  if (firstCharacter === "'") {
    const closingQuoteIndex = q.indexOf("'", 1);
    if (closingQuoteIndex === -1) {
      throw new Error(`missing "'" in query`);
    }
    const value = q.substring(1, closingQuoteIndex);
    if (closingQuoteIndex === q.length - 1) {
      return [value, ''];
    }
    return [value, q.substring(closingQuoteIndex + 1).trim()];
  }

  if (firstCharacter === '"') {
    const closingQuoteIndex = q.indexOf('"', 1);
    if (closingQuoteIndex === -1) {
      throw new Error(`missing '"' in query`);
    }
    const value = q.substring(1, closingQuoteIndex);
    if (closingQuoteIndex === q.length - 1) {
      return [value, ''];
    }
    return [value, q.substring(closingQuoteIndex + 1).trim()];
  }

  // just read until next blank
  const nextSpaceIndex = q.indexOf(' ');
  if (nextSpaceIndex === -1) {
    return [q, ''];
  }
  const value = q.substring(0, nextSpaceIndex);
  if (nextSpaceIndex === q.length - 1) {
    return [value, ''];
  }
  return [value, q.substring(nextSpaceIndex + 1).trim()];
}

function queryPart2sql(qParent: string): string {
  const queryPart2sqlInner = (q: string): string => {
    const query = q.trim();

    if (query.startsWith('(')) {
      // Find closing parenthesis
      let countOpening = 0;
      for (let i = 0; i < query.length; i++) {
        if (query.charAt(i) === '(') {
          countOpening++;
        } else if (query.charAt(i) === ')') {
          countOpening--;
          if (countOpening === 0) {
            let sql = `(${queryPart2sqlInner(query.substring(1, i))})`;
            if (i < query.length - 1) {
              sql += ` AND ${queryPart2sqlInner(query.substring(i + 1))}`;
            }
            return sql;
          }
        }
      }
      throw new Error("missing ')' in query");
    }

    if (query.startsWith('#')) {
      const i = query.indexOf(' ');
      if (i === -1) {
        return `note.tags LIKE '%${query.substring(1)}%'`;
      }
      // eslint-disable-next-line prettier/prettier
      return `note.tags LIKE '%${query.substring(1, i)}%' AND ${queryPart2sqlInner(query.substring(i + 1))}`;
    }

    if (query.startsWith('OR ') || query.startsWith('or ')) {
      return `OR ${queryPart2sqlInner(query.substring(3))}`;
    }
    if (query.startsWith('AND ') || query.startsWith('and ')) {
      return `AND ${queryPart2sqlInner(query.substring(3))}`;
    }

    if (query.startsWith('path:')) {
      const subQuery = query.substring('path:'.length);
      const [value, remainingQuery] = readStringValue(subQuery);
      let sql = `note.relative_path LIKE '${value}%'`;
      if (remainingQuery) {
        sql += ` AND ${queryPart2sqlInner(remainingQuery)}`;
      }
      return sql;
    }

    if (query.startsWith('@kind:')) {
      const nextSpaceIndex = query.indexOf(' ');
      let kind = '';
      let remainingQuery;
      if (nextSpaceIndex === -1) {
        kind = query.substring('@kind:'.length);
      } else {
        kind = query.substring('@kind:'.length, nextSpaceIndex);
        remainingQuery = query.substring(nextSpaceIndex);
      }
      let sql = `note.kind='${kind}'`;
      if (remainingQuery) {
        sql += ` AND ${queryPart2sqlInner(remainingQuery)}`;
      }
      return sql;
    }

    if (query.startsWith('@')) {
      const nextColonIndex = query.indexOf(':');
      if (nextColonIndex === -1) {
        throw new Error(`missing ':' in query`);
      }
      const name = query.substring(1, nextColonIndex);
      const subQuery = query.substring(nextColonIndex + 1);
      const [value, remainingQuery] = readStringValue(subQuery);
      let sql = `json_extract(note.attributes, "$.${name}") = "${value}"`;
      if (remainingQuery) {
        sql += ` AND ${queryPart2sqlInner(remainingQuery)}`;
      }
      return sql;
    }

    // Or just a text to match
    const [value, remainingQuery] = readStringValue(query);
    let sql = `note_fts MATCH '${value}'`;
    if (remainingQuery) {
      sql += ` AND ${queryPart2sqlInner(remainingQuery)}`;
    }
    return sql;
  };

  let result = queryPart2sqlInner(qParent);
  // Fix a bug in logic as we systematically append 'AND' when the query is not
  // completely parsed even if the following keyword is 'OR'
  result = result.replace('AND OR', 'OR');
  return result;
}

// eslint-disable-next-line import/prefer-default-export
export function query2sql(q: string, limit: number, shuffle: boolean): string {
  const whereContent = queryPart2sql(q);
  const fields =
    'note.oid, note.file_oid, note.kind, note.relative_path, note.wikilink, note.attributes, note.tags, note.line, note.title_html, note.content_html, note.comment_html';
  let sql = `SELECT ${fields} FROM note_fts JOIN note on note.oid = note_fts.oid`;
  if (whereContent) {
    sql += ` WHERE ${whereContent}`;
  }
  if (shuffle) {
    sql += ` ORDER BY RANDOM()`;
  }
  if (limit > 0) {
    sql += ` LIMIT ${limit}`;
  }
  sql += ';';
  return sql;
}

export function calculateDueDate(): string {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const dueDate = now.toDateString(); // Ex: "2006-01-02T15:04:05.999999999Z07:00"
  return dueDate;
}
