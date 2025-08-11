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

// Extract medias relative paths from a single note
function extractMediaRelativePaths(note: Model.Note): string[] {
  const results: string[] = [];

  const re: RegExp = /<media relative-path="(.*?)".*?\/>/g;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    m = re.exec(note.body);
    if (m == null) {
      break;
    }
    results.push(m[1]);
  }

  return results;
}

export default class DatabaseManager {
  repositories: Map<string, Model.RepositoryRefConfig>;

  // List of datasources based on repositories defined in global configuration
  datasources: Map<string, Database>;

  datasourcesPaths: Map<string, string>;

  constructor() {
    this.repositories = new Map();
    this.datasources = new Map<string, Database>();
    this.datasourcesPaths = new Map<string, string>();
  }

  close(): void {
    this.datasources.forEach((db, name) => {
      console.debug(`Closing datasource ${name}`);
      db.close();
    });
  }

  registerRepository(repository: Model.RepositoryRefConfig): this {
    this.repositories.set(repository.slug, repository);

    const repositoryPath = normalizePath(repository.path);
    const dbPath = path.join(repositoryPath, '.nt/database.db');
    if (fs.existsSync(dbPath)) {
      console.debug(`Using database ${dbPath}`);
      const db = new Database(dbPath);
      this.datasources.set(repository.slug, db);
      this.datasourcesPaths.set(repository.slug, repositoryPath);
    } else {
      throw new Error(`Missing database ${dbPath}`);
    }

    return this;
  }

  // Returns the absolute for to the repository root directory from its slug name.
  #getRepositoryPath(slug: string): string {
    const absolutePath = this.datasourcesPaths.get(slug);
    if (!absolutePath) {
      throw new Error(`missing path for repository ${slug}`);
    }
    return absolutePath;
  }

  // Retrieve all Goto links.
  async getGotos(repositorySlugs: string[]): Promise<Model.Goto[]> {
    const repositoryResults: Promise<Model.Goto[]>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        repositorySlugs.length === 0 ||
        repositorySlugs.includes(datasourceName)
      ) {
        const db = this.datasources.get(datasourceName);
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`);
        }
        repositoryResults.push(
          new Promise<Model.Goto[]>((resolve, reject) => {
            db.all(
              `
                SELECT oid, text, url, title, go_name, created_at
                FROM goto
              `,
              (err: any, rows: any) => {
                if (err) {
                  console.log('Error while fetching Goto links', err);
                  reject(err);
                } else {
                  const result: Model.Goto[] = [];
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    result.push({
                      oid: row.oid,
                      oidNote: row.note_oid,
                      relativePath: row.relative_path,
                      text: row.text,
                      url: row.url,
                      title: row.title,
                      goName: row.go_name,
                    });
                  }
                  resolve(result);
                }
              },
            );
          }),
        );
      }
    }
    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      return new Promise<Model.Goto[]>((resolve) => {
        const result: Model.Goto[] = [];
        for (const repositoryResult of allRepositoryResults) {
          result.push(...repositoryResult);
        }
        resolve(result);
      });
    });
  }

  async searchMediasByRelativePaths(
    relativePaths: string[],
    datasourceName: string,
  ): Promise<Model.Media[]> {
    // Nothing to search
    if (relativePaths.length === 0) {
      return new Promise<Model.Media[]>((resolve) => {
        resolve([]);
      });
    }

    const db = this.datasources.get(datasourceName);
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`);
    }
    return new Promise<Model.Media[]>((resolve, reject) => {
      const sqlRelativePaths = `'${relativePaths.join("','")}'`;
      const sqlQuery = `
        SELECT m.oid, m.relative_path, m.kind, m.extension, b.oid as blobOid, b.mime as blobMime, b.tags as blobTags
        FROM media m JOIN blob b on m.oid = b.media_oid
        WHERE m.dangling = 0 AND m.relative_path IN (${sqlRelativePaths})
      `;
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
              mimeType: row.blobMime,
              attributes: {}, // not used for now
              tags: blobTags,
            });
          } else {
            lastMediaOid = row.oid;
            medias.push({
              oid: row.oid,
              kind: row.kind,
              extension: row.extension,
              relativePath: row.relative_path,
              blobs: [
                {
                  oid: row.blobOid,
                  mimeType: row.blobMime,
                  attributes: {}, // not used for now
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

  async searchMedias(
    oids: string[],
    datasourceName: string,
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
        SELECT m.oid, m.relative_path, m.kind, m.extension, b.oid as blobOid, b.mime as blobMime, b.tags as blobTags
        FROM media m JOIN blob b on m.oid = b.media_oid
        WHERE m.dangling = 0 AND m.oid IN (${sqlOids})
      `;
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
              mimeType: row.blobMime,
              attributes: {}, // not used for now
              tags: blobTags,
            });
          } else {
            lastMediaOid = row.oid;
            medias.push({
              oid: row.oid,
              kind: row.kind,
              extension: row.extension,
              relativePath: row.relative_path,
              blobs: [
                {
                  oid: row.blobOid,
                  mimeType: row.blobMime,
                  attributes: {}, // not used for now
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
    shuffle: boolean,
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
        const mediaRelativePaths: string[] = []; // The list of all medias found
        const notesMediaRelativePaths = new Map<string, string[]>(); // The mapping of note <-> medias

        // Iterate over found notes and search for potential referenced medias
        for (let i = 0; i < rows.length; i++) {
          const note = this.#rowToNote(rows[i], datasourceName);
          const noteMediaRelativePaths = extractMediaRelativePaths(note);
          notesMediaRelativePaths.set(note.oid, noteMediaRelativePaths);
          mediaRelativePaths.push(...noteMediaRelativePaths);
          notes.push(note);
        }

        // Search for medias
        const foundMedias = await this.searchMediasByRelativePaths(
          mediaRelativePaths,
          datasourceName,
        );
        console.log(
          `Found ${notes.length} notes, ${foundMedias.length} medias`,
        );
        const mediasByRelativePaths = new Map<string, Model.Media>();
        foundMedias.forEach((media: Model.Media) =>
          mediasByRelativePaths.set(media.relativePath, media),
        );

        // Append found medias on notes
        for (let i = 0; i < notes.length; i++) {
          const note = notes[i];
          if (!notesMediaRelativePaths.has(note.oid)) {
            // No medias for this note
            continue;
          }

          const referencedMediaRelativePaths = notesMediaRelativePaths.get(
            note.oid,
          );
          referencedMediaRelativePaths?.forEach((mediaRelativePath) => {
            const media = mediasByRelativePaths.get(mediaRelativePath);
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
    repositorySlugs: string[],
  ): Promise<Map<string, number>> {
    const repositoryResults: Promise<Map<string, number>>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        repositorySlugs.length === 0 ||
        repositorySlugs.includes(datasourceName)
      ) {
        const db = this.datasources.get(datasourceName);
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`);
        }

        repositoryResults.push(
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
                    err,
                  );
                  reject(err);
                } else {
                  const result: Map<string, number> = new Map();
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const { nationality } = row;
                    const count = row.count_notes;
                    result.set(nationality, count);
                  }
                  resolve(result);
                }
              },
            );
          }),
        );
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      return new Promise<Map<string, number>>((resolve) => {
        const result: Map<string, number> = new Map();
        for (const repositoryResult of allRepositoryResults) {
          for (const [key, value] of repositoryResult) {
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

  async countNotesPerType(
    repositorySlugs: string[],
  ): Promise<Map<string, number>> {
    const repositoryResults: Promise<Map<string, number>>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        repositorySlugs.length === 0 ||
        repositorySlugs.includes(datasourceName)
      ) {
        const db = this.datasources.get(datasourceName);
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`);
        }

        repositoryResults.push(
          new Promise<Map<string, number>>((resolve, reject) => {
            db.all(
              `
                SELECT n.note_type as type, count(*) as count_notes
                FROM note n
                GROUP BY n.note_type
              `,
              (err: any, rows: any) => {
                if (err) {
                  console.log(
                    'Error while searching for statistics about kinds',
                    err,
                  );
                  reject(err);
                } else {
                  const result: Map<string, number> = new Map();
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const noteType = row.type;
                    const count = row.count_notes;
                    result.set(noteType, count);
                  }
                  resolve(result);
                }
              },
            );
          }),
        );
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      return new Promise<Map<string, number>>((resolve) => {
        const result: Map<string, number> = new Map();
        for (const repositoryResult of allRepositoryResults) {
          for (const [key, value] of repositoryResult) {
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

  // Quote to display when no quote exists in the database
  defaultQuote(datasourceName: string): Model.Note {
    return {
      oid: '0000000000000000000000000000000000000000',
      oidFile: '0000000000000000000000000000000000000000',
      repositorySlug: datasourceName,
      repositoryPath: this.#getRepositoryPath(datasourceName),
      slug: 'default-quote',
      type: 'quote',
      relativePath: 'dummy',
      wikilink: 'dummy',
      attributes: {},
      tags: [],
      line: 0,
      title: 'Quote: On Writing',
      longTitle: 'On Writing',
      shortTitle: 'On Writing',
      marked: false,
      annotations: [],
      content:
        '## Quote: On Writing\n\n> Writing is thinking. To write well is to think clearly. That’s why it’s so hard.\n> -- David McCullough, American historian and author',
      body: '> Writing is thinking. To write well is to think clearly. That’s why it’s so hard.\n> -- David McCullough, American historian and author',
      comment: '',
      medias: [],
    };
  }

  async searchDailyQuote(query: Model.Query): Promise<Model.Note> {
    // Choose a datasource
    let selectedDatasourceName: string;
    if (!query.repositories || query.repositories.length === 0) {
      selectedDatasourceName = randomElement([...this.datasources.keys()]);
    } else if (query.repositories.length === 1) {
      // eslint-disable-next-line prefer-destructuring
      selectedDatasourceName = query.repositories[0];
    } else {
      selectedDatasourceName = randomElement(query.repositories);
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
            slug,
            note_type,
            relative_path,
            wikilink,
            attributes,
            title,
            long_title,
            short_title,
            attributes,
            tags,
            line,
            content,
            body,
            comment,
            marked,
            annotations
          FROM note
          WHERE note_type = 'Quote'
          ORDER BY RANDOM()
          LIMIT 1`,
        (err: any, rows: any) => {
          if (err) {
            console.log('Error while searching for a daily quote', err);
            reject(err);
          } else if (rows.length > 0) {
            // Return the first note as randomly ordered
            resolve(this.#rowToNote(rows[0], selectedDatasourceName));
          } else {
            resolve(this.defaultQuote(selectedDatasourceName));
          }
        },
      );
    });
  }

  async find(noteRef: Model.NoteRef): Promise<Model.Note> {
    const datasourceName = noteRef.repositorySlug;
    const db = this.datasources.get(datasourceName);
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`);
    }
    return new Promise<Model.Note>((resolve, reject) => {
      const sqlQuery = `
        SELECT
          oid,
          file_oid,
          slug,
          note_type,
          relative_path,
          wikilink,
          attributes,
          title,
          long_title,
          short_title,
          attributes,
          tags,
          line,
          content,
          body,
          comment,
          marked,
          annotations
        FROM note
        WHERE oid = ?
      `;
      db.get(sqlQuery, [noteRef.oid], async (err: any, row: any) => {
        if (err) {
          console.log('Error while searching for note by id', err);
          reject(err);
          return;
        }
        const note = this.#rowToNote(row, datasourceName);
        const mediaRelativePaths = extractMediaRelativePaths(note);

        // Append found medias on note
        const foundMedias = await this.searchMediasByRelativePaths(
          mediaRelativePaths,
          datasourceName,
        );
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
    const oidByRepository = new Map<string, string[]>();
    for (const noteRef of noteRefs) {
      if (!oidByRepository.has(noteRef.repositorySlug)) {
        oidByRepository.set(noteRef.repositorySlug, []);
      }
      oidByRepository.get(noteRef.repositorySlug)?.push(noteRef.oid);
    }

    // Trigger one query per datasource
    const results: Promise<Model.Note[]>[] = [];
    for (const [datasourceName, oids] of oidByRepository) {
      const db = this.datasources.get(datasourceName);
      if (!db) {
        throw new Error(`No datasource ${datasourceName} found`);
      }
      const result = new Promise<Model.Note[]>((resolve, reject) => {
        const sqlQuery = `
          SELECT
            oid,
            file_oid,
            slug,
            note_type,
            relative_path,
            wikilink,
            attributes,
            title,
            long_title,
            short_title,
            attributes,
            tags,
            line,
            content,
            body,
            comment,
            marked,
            annotations
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
          const mediaRelativePaths: string[] = []; // The list of all medias found
          const notesMediaRelativePaths = new Map<string, string[]>(); // The mapping of note <-> medias

          // Iterate over found notes and search for potential referenced medias
          for (let i = 0; i < rows.length; i++) {
            const note = this.#rowToNote(rows[i], datasourceName);
            const noteMediaRelativePaths = extractMediaRelativePaths(note);
            notesMediaRelativePaths.set(note.oid, noteMediaRelativePaths);
            mediaRelativePaths.push(...noteMediaRelativePaths);
            notes.push(note);
          }

          // Search for medias
          const foundMedias = await this.searchMediasByRelativePaths(
            mediaRelativePaths,
            datasourceName,
          );
          const mediasByRelativePath = new Map<string, Model.Media>();
          foundMedias.forEach((media) =>
            mediasByRelativePath.set(media.relativePath, media),
          );

          // Append found medias on notes
          for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            if (!notesMediaRelativePaths.has(note.oid)) {
              // No medias for this note
              continue;
            }

            const referencedMediaRelativePaths = notesMediaRelativePaths.get(
              note.oid,
            );
            referencedMediaRelativePaths?.forEach((mediaRelativePath) => {
              const media = mediasByRelativePath.get(mediaRelativePath);
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
        !query.repositories ||
        query.repositories.length === 0 ||
        query.repositories.includes(datasourceName)
      ) {
        results.push(
          this.searchNotes(query.q, datasourceName, query.limit, query.shuffle),
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

  async listFiles(repositorySlugs: string[]): Promise<Model.File[]> {
    const repositoryResults: Promise<Model.File[]>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        repositorySlugs.length === 0 ||
        repositorySlugs.includes(datasourceName)
      ) {
        const db = this.datasources.get(datasourceName);
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`);
        }

        repositoryResults.push(
          new Promise<Model.File[]>((resolve, reject) => {
            db.all(
              `
                SELECT
                  file.oid as oid,
                  file.slug as slug,
                  file.relative_path as relative_path,
                  file.wikilink as wikilink,
                  file.title as title,
                  file.short_title as short_title,
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
              },
            );
          }),
        );
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      return new Promise<Model.File[]>((resolve) => {
        const result: Model.File[] = [];
        for (const repositoryResult of allRepositoryResults) {
          result.push(...repositoryResult);
        }
        resolve(result);
      });
    });
  }

  async listNotesInFile(
    repositorySlug: string,
    relativePath: string,
  ): Promise<Model.Note[]> {
    return this.searchNotes(`path:${relativePath}`, repositorySlug, 0, false);
  }

  /* Deck Management */

  async getDeckStats(
    repositorySlug: string,
    deckConfig: Model.DeckConfig,
  ): Promise<Model.StatsDeck> {
    const db = this.datasources.get(repositorySlug);
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`);
    }

    return new Promise<Model.StatsDeck>((resolve, reject) => {
      let sql = `
        SELECT
          COUNT(CASE WHEN flashcard.due_at IS NOT NULL AND flashcard.due_at < '${calculateDueDate()}' THEN 1 END) as count_due,
          COUNT(CASE WHEN flashcard.due_at IS NULL OR flashcard.due_at = '' THEN 1 END) as count_new
        FROM note_fts JOIN note on note.oid = note_fts.oid
        JOIN flashcard on flashcard.note_oid = note.oid WHERE note.note_type='Flashcard'`;
      const whereContent = queryPart2sql(deckConfig.query);
      if (whereContent) {
        sql += ` AND ${whereContent}`;
      }
      sql += ';';

      db.get(sql, (err: any, row: any) => {
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
    repositorySlug: string,
    deckConfig: Model.DeckConfig,
  ): Promise<Model.Flashcard[]> {
    const db = this.datasources.get(repositorySlug);
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`);
    }

    return new Promise<Model.Flashcard[]>((resolve, reject) => {
      const sql = `
        SELECT
          flashcard.oid,
          flashcard.file_oid,
          flashcard.note_oid,
          note.relative_path,
          note.short_title,
          note.tags,
          note.attributes,
          flashcard.front,
          flashcard.back,
          flashcard.due_at,
          flashcard.studied_at,
          flashcard.settings
        FROM note_fts JOIN note on note.oid = note_fts.oid
        JOIN flashcard on flashcard.note_oid = note.oid
        WHERE note.note_type='Flashcard'
        AND (flashcard.due_at IS NOT NULL AND flashcard.due_at < '${calculateDueDate()}')
        AND ${queryPart2sql(deckConfig.query)}

        UNION

        SELECT
          flashcard.oid,
          flashcard.file_oid,
          flashcard.note_oid,
          note.relative_path,
          note.short_title,
          note.tags,
          note.attributes,
          flashcard.front,
          flashcard.back,
          flashcard.due_at,
          flashcard.studied_at,
          flashcard.settings
        FROM note_fts JOIN note on note.oid = note_fts.oid
        JOIN flashcard on flashcard.note_oid = note.oid
        WHERE note.note_type='Flashcard'
        AND (flashcard.due_at IS NULL OR flashcard.due_at = '')
        AND ${queryPart2sql(deckConfig.query)}
        `;

      db.all(sql, (err: any, rows: any[]) => {
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
            relativePath: row.relative_path,
            shortTitle: row.short_title,
            tags: row.tags.split(','),
            attributes: JSON.parse(row.attributes),
            front: row.front,
            back: row.back,
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
    repositorySlug: string,
    deckConfig: Model.DeckConfig,
    flashcard: Model.Flashcard,
  ): Promise<Model.Flashcard> {
    const db = this.datasources.get(repositorySlug);
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`);
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

  #rowToFile(row: any, repositorySlug: string): Model.File {
    return {
      oid: row.oid,
      repositorySlug,
      repositoryPath: this.#getRepositoryPath(repositorySlug),
      slug: row.slug,
      relativePath: row.relative_path,
      wikilink: row.wikilink,
      title: row.title,
      shortTitle: row.short_title,
    };
  }

  #rowToNote(row: any, repositorySlug: string): Model.Note {
    let parsedTags = [];
    if (row.tags !== '') parsedTags = row.tags.split(',');
    return {
      oid: row.oid,
      oidFile: row.file_oid,
      repositorySlug,
      repositoryPath: this.#getRepositoryPath(repositorySlug),
      slug: row.slug,
      type: row.note_type,
      relativePath: row.relative_path,
      wikilink: row.wikilink,
      attributes: JSON.parse(row.attributes),
      tags: parsedTags,
      line: row.line,
      title: row.title,
      longTitle: row.long_title,
      shortTitle: row.short_title,
      marked: row.marked,
      annotations: JSON.parse(row.annotations) as Model.Annotation[],
      content: row.content,
      body: row.body,
      comment: row.comment,
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

    if (query.startsWith('@type:')) {
      const nextSpaceIndex = query.indexOf(' ');
      let noteType = '';
      let remainingQuery;
      if (nextSpaceIndex === -1) {
        noteType = query.substring('@type:'.length);
      } else {
        noteType = query.substring('@type:'.length, nextSpaceIndex);
        remainingQuery = query.substring(nextSpaceIndex);
      }
      let sql = `note.note_type='${noteType}'`;
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
    'note.oid, note.file_oid, note.note_type, note.slug, note.relative_path, note.wikilink, note.attributes, note.tags, note.line, note.title, note.short_title, note.long_title, note.content, note.body, note.comment, note.marked, note.annotations';
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
  const dueDate = now.toISOString(); // Ex: "2006-01-02T15:04:05.999999999Z07:00"
  return dueDate;
}
