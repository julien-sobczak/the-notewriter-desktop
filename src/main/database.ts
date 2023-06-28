import { Database, verbose as sqlite3Verbose } from 'sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Note, Media } from '../shared/model/Note';
import { Query, QueryResult } from '../shared/model/Query';
import { Workspace } from '../shared/model/Config';

sqlite3Verbose();

// See for async/await https://github.com/danielsomerfield/function-first-composition-example-typescript/blob/main/test/domainTestingHelpers.ts

// Returns an absolute normalized path.
function normalizePath(relativePath: string) {
  return path.normalize(relativePath.replace('~', os.homedir));
}

export default class DatabaseManager {
  workspaces: Map<string, Workspace>;

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

  registerWorkspace(workspace: Workspace): this {
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

  async searchMedias(oids: string[], datasourceName: string): Promise<Media[]> {
    const db = this.datasources.get(datasourceName);
    if (!db) {
      throw new Error('No datasource found');
    }
    return new Promise<Media[]>((resolve, reject) => {
      const sqlOids = `'${oids.join("','")}'`;
      const sqlQuery = `
        SELECT m.oid, m.kind, b.oid as blobOid, b.mime as blobMime, b.tags as blobTags
        FROM media m JOIN blob b on m.oid = b.media_oid
        WHERE m.dangling = 0 AND m.oid IN (${sqlOids})
      `;
      db.all(sqlQuery, async (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for medias', err);
          reject(err);
          return;
        }

        const medias: Media[] = [];
        let lastMediaOid: string | undefined;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (lastMediaOid === row.oid) {
            medias[medias.length - 1].blobs.push({
              oid: row.blobOid,
              mime: row.blobMime,
              tags: row.blobTags,
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
                  tags: row.blobTags.split(','),
                },
              ],
            });
          }
        }
        resolve(medias);
      });
    });
  }

  async searchNotes(q: string, datasourceName: string): Promise<Note[]> {
    const db = this.datasources.get(datasourceName);
    if (!db) {
      throw new Error('No datasource found');
    }
    return new Promise<Note[]>((resolve, reject) => {
      const sqlQuery = query2sql(q);
      console.debug(`[${datasourceName}] ${sqlQuery}`);
      db.all(sqlQuery, async (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for notes', err);
          reject(err);
          return;
        }

        const notes: Note[] = [];
        const mediaOids: string[] = [];
        const notesMediaOids = new Map<string, string[]>();

        // Iterate over found notes and search for potential referenced medias
        for (let i = 0; i < rows.length; i++) {
          const note = this.#rowToNote(rows[i], datasourceName);
          const re: RegExp = /oid:([a-zA-Z0-9]{40})/g;
          let m: RegExpExecArray | null;
          const noteMediaOids: string[] = [];
          // eslint-disable-next-line no-constant-condition
          while (true) {
            m = re.exec(note.content);
            if (m == null) {
              break;
            }
            noteMediaOids.push(m[1]);
          }
          if (noteMediaOids.length > 0) {
            notesMediaOids.set(note.oid, noteMediaOids);
            mediaOids.push(...noteMediaOids);
          }
          notes.push(note);
        }

        // Search for medias
        const foundMedias = await this.searchMedias(mediaOids, datasourceName);
        const mediasByOids = new Map<string, Media>();
        foundMedias.forEach((media) => mediasByOids.set(media.oid, media));

        // Append found medias on notes
        for (let i = 0; i < notes.length; i++) {
          const note = notes[i];
          if (!notesMediaOids.has(note.oid)) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const referencedMediaOids = notesMediaOids.get(note.oid);
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

  async searchDailyQuote(): Promise<Note> {
    const datasourceName = 'main'; // FIXME use all selected workspaces by default
    const db = this.datasources.get(datasourceName);
    if (!db) {
      throw new Error('No datasource found');
    }
    return new Promise<Note>((resolve, reject) => {
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
            const note = this.#rowToNote(rows[0], datasourceName);
            resolve(note);
          }
        }
      );
    });
  }

  async search(query: Query): Promise<QueryResult> {
    const results: Promise<Note[]>[] = [];
    for (const datasourceName of this.datasources.keys()) {
      if (
        !query.workspaces ||
        query.workspaces.length === 0 ||
        query.workspaces.includes(datasourceName)
      ) {
        results.push(this.searchNotes(query.q, datasourceName));
      }
    }

    return Promise.all(results).then((allNotes) => {
      return new Promise<QueryResult>((resolve) => {
        let returnedNotes: Note[] = [];
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

  async multiSearch(queries: Query[]): Promise<QueryResult[]> {
    const results: Promise<QueryResult>[] = [];
    for (const query of queries) {
      results.push(this.search(query));
    }

    return Promise.all(results).then((allResults) => {
      return new Promise<QueryResult[]>((resolve) => {
        resolve(allResults);
      });
    });
  }

  /* Converters */

  #rowToNote(row: any, workspaceSlug: string): Note {
    return {
      oid: row.oid,
      oidFile: row.file_oid,
      workspaceSlug,
      workspacePath: this.#getWorkspacePath(workspaceSlug),
      kind: row.kind,
      relativePath: row.relative_path,
      wikilink: row.wikilink,
      attributes: JSON.parse(row.attributes),
      tags: row.tags.split(','),
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

function queryPart2sql(q: string): string {
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
          let sql = `(${queryPart2sql(query.substring(1, i))})`;
          if (i < query.length - 1) {
            sql += ` AND ${queryPart2sql(query.substring(i + 1))}`;
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
    return `note.tags LIKE '%${query.substring(1, i)}%' AND ${queryPart2sql(query.substring(i + 1))}`;
  }

  if (query.startsWith('OR ') || query.startsWith('or ')) {
    return `OR ${queryPart2sql(query.substring(3))}`;
  }
  if (query.startsWith('AND ') || query.startsWith('and ')) {
    return `AND ${queryPart2sql(query.substring(3))}`;
  }

  if (query.startsWith('path:')) {
    const subQuery = query.substring('path:'.length);
    const [value, remainingQuery] = readStringValue(subQuery);
    let sql = `note.relative_path LIKE '${value}%'`;
    if (remainingQuery) {
      sql += ` AND ${queryPart2sql(remainingQuery)}`;
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
      sql += ` AND ${queryPart2sql(remainingQuery)}`;
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
      sql += ` AND ${queryPart2sql(remainingQuery)}`;
    }
    return sql;
  }

  // Or just a text to match
  const [value, remainingQuery] = readStringValue(query);
  let sql = `note_fts MATCH '${value}'`;
  if (remainingQuery) {
    sql += ` AND ${queryPart2sql(remainingQuery)}`;
  }
  return sql;
}

// eslint-disable-next-line import/prefer-default-export
export function query2sql(q: string): string {
  let whereContent = queryPart2sql(q);
  // Fix a bug in logic as we systematically append 'AND' when the query is not
  // completely parsed even if the following keyword is 'OR'
  whereContent = whereContent.replace('AND OR', 'OR');
  const fields =
    'note.oid, note.file_oid, note.kind, note.relative_path, note.wikilink, note.attributes, note.tags, note.line, note.title_html, note.content_html, note.comment_html';
  let sql = `SELECT ${fields} FROM note_fts JOIN note on note.oid = note_fts.oid`;
  if (whereContent) {
    sql += ` WHERE ${whereContent}`;
  }
  sql += ';';
  return sql;
}
