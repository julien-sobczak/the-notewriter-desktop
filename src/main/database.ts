/* eslint-disable @typescript-eslint/no-shadow */
import { Database, verbose as sqlite3Verbose } from 'sqlite3'
import fs from 'fs'
import path from 'path'
import { normalizePath } from './util'
import {
  Annotation,
  DeckConfig,
  File,
  Flashcard,
  Goto,
  Items,
  JournalActivity,
  Media,
  MediaDirStat,
  Memory,
  Note,
  NoteRef,
  ParentNote,
  Query,
  QueryResult,
  Reminder,
  RepositoryRefConfig,
  StatsDeck
} from './Model'

sqlite3Verbose()

// See for async/await https://github.com/danielsomerfield/function-first-composition-example-typescript/blob/main/test/domainTestingHelpers.ts

function randomElement(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)]
}

// Extract medias relative paths from a single note
function extractMediaRelativePaths(note: Note): string[] {
  const results: string[] = []

  const re: RegExp = /<media relative-path="(.*?)".*?\/>/g
  let m: RegExpExecArray | null
  while (true) {
    m = re.exec(note.body)
    if (m == null) {
      break
    }
    results.push(m[1])
  }

  return results
}

export default class DatabaseManager {
  repositories: Map<string, RepositoryRefConfig>

  // List of datasources based on repositories defined in global configuration
  datasources: Map<string, Database>

  datasourcesPaths: Map<string, string>

  private constructor() {
    this.repositories = new Map()
    this.datasources = new Map<string, Database>()
    this.datasourcesPaths = new Map<string, string>()
  }

  // Async factory method for creating DatabaseManager
  static async create(): Promise<DatabaseManager> {
    return new DatabaseManager()
  }

  close(): void {
    this.datasources.forEach((db, name) => {
      console.debug(`Closing datasource ${name}`)
      db.close()
    })
  }

  registerRepository(repository: RepositoryRefConfig): this {
    this.repositories.set(repository.slug, repository)

    const repositoryPath = normalizePath(repository.path)
    const dbPath = path.join(repositoryPath, '.nt/database.db')
    if (fs.existsSync(dbPath)) {
      console.debug(`Using database ${dbPath}`)
      const db = new Database(dbPath)
      this.datasources.set(repository.slug, db)
      this.datasourcesPaths.set(repository.slug, repositoryPath)
    } else {
      throw new Error(`Missing database ${dbPath}`)
    }

    return this
  }

  // Returns the absolute for to the repository root directory from its slug name.
  #getRepositoryPath(slug: string): string {
    const absolutePath = this.datasourcesPaths.get(slug)
    if (!absolutePath) {
      throw new Error(`missing path for repository ${slug}`)
    }
    return absolutePath
  }

  // Retrieve all Goto links.
  async getGotos(repositorySlugs: string[]): Promise<Goto[]> {
    const repositoryResults: Promise<Goto[]>[] = []
    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
        }
        repositoryResults.push(
          new Promise<Goto[]>((resolve, reject) => {
            db.all(
              `
                SELECT oid, text, url, title, name, created_at
                FROM goto
              `,
              (err: any, rows: any) => {
                if (err) {
                  console.log('Error while fetching Goto links', err)
                  reject(err)
                } else {
                  const result: Goto[] = []
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i]
                    result.push({
                      oid: row.oid,
                      oidNote: row.note_oid,
                      relativePath: row.relative_path,
                      text: row.text,
                      url: row.url,
                      title: row.title,
                      name: row.name
                    })
                  }
                  resolve(result)
                }
              }
            )
          })
        )
      }
    }
    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      return new Promise<Goto[]>((resolve) => {
        const result: Goto[] = []
        for (const repositoryResult of allRepositoryResults) {
          result.push(...repositoryResult)
        }
        resolve(result)
      })
    })
  }

  async searchMediasByRelativePaths(
    relativePaths: string[],
    datasourceName: string
  ): Promise<Media[]> {
    // Nothing to search
    if (relativePaths.length === 0) {
      return new Promise<Media[]>((resolve) => {
        resolve([])
      })
    }

    const db = this.datasources.get(datasourceName)
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`)
    }
    return new Promise<Media[]>((resolve, reject) => {
      const sqlRelativePaths = `'${relativePaths.join("','")}'`
      const sqlQuery = `
        SELECT m.oid, m.relative_path, m.kind, m.extension, b.oid as blobOid, b.mime as blobMime, b.tags as blobTags
        FROM media m JOIN blob b on m.oid = b.media_oid
        WHERE m.dangling = 0 AND m.relative_path IN (${sqlRelativePaths})
      `
      db.all(sqlQuery, async (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for medias', err)
          reject(err)
          return
        }

        const medias: Media[] = []
        let lastMediaOid: string | undefined
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          let blobTags = []
          if (rows.blobTags !== '') blobTags = row.blobTags.split(',')
          if (lastMediaOid === row.oid) {
            medias[medias.length - 1].blobs.push({
              oid: row.blobOid,
              mimeType: row.blobMime,
              attributes: {}, // not used for now
              tags: blobTags
            })
          } else {
            lastMediaOid = row.oid
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
                  tags: blobTags
                }
              ]
            })
          }
        }
        resolve(medias)
      })
    })
  }

  async searchMedias(oids: string[], datasourceName: string): Promise<Media[]> {
    // Nothing to search
    if (oids.length === 0) {
      return new Promise<Media[]>((resolve) => {
        resolve([])
      })
    }

    const db = this.datasources.get(datasourceName)
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`)
    }
    return new Promise<Media[]>((resolve, reject) => {
      const sqlOids = `'${oids.join("','")}'`
      const sqlQuery = `
        SELECT m.oid, m.relative_path, m.kind, m.extension, b.oid as blobOid, b.mime as blobMime, b.tags as blobTags
        FROM media m JOIN blob b on m.oid = b.media_oid
        WHERE m.dangling = 0 AND m.oid IN (${sqlOids})
      `
      db.all(sqlQuery, async (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for medias', err)
          reject(err)
          return
        }

        const medias: Media[] = []
        let lastMediaOid: string | undefined
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          let blobTags = []
          if (rows.blobTags !== '') blobTags = row.blobTags.split(',')
          if (lastMediaOid === row.oid) {
            medias[medias.length - 1].blobs.push({
              oid: row.blobOid,
              mimeType: row.blobMime,
              attributes: {}, // not used for now
              tags: blobTags
            })
          } else {
            lastMediaOid = row.oid
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
                  tags: blobTags
                }
              ]
            })
          }
        }
        resolve(medias)
      })
    })
  }

  async searchNotes(
    q: string,
    datasourceName: string,
    limit: number,
    shuffle: boolean
  ): Promise<Note[]> {
    const db = this.datasources.get(datasourceName)
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`)
    }
    return new Promise<Note[]>((resolve, reject) => {
      const sqlQuery = query2sql(q, limit, shuffle)
      console.debug(`[${datasourceName}] ${sqlQuery}`)
      db.all(sqlQuery, async (err: any, rows: any) => {
        if (err) {
          console.log('Error while searching for notes', err)
          reject(err)
          return
        }

        const notes: Note[] = [] // The found notes
        const mediaRelativePaths: string[] = [] // The list of all medias found
        const notesMediaRelativePaths = new Map<string, string[]>() // The mapping of note <-> medias

        // Iterate over found notes and search for potential referenced medias
        for (let i = 0; i < rows.length; i++) {
          const note = this.#rowToNote(rows[i], datasourceName)
          const noteMediaRelativePaths = extractMediaRelativePaths(note)
          notesMediaRelativePaths.set(note.oid, noteMediaRelativePaths)
          mediaRelativePaths.push(...noteMediaRelativePaths)
          notes.push(note)
        }

        // Search for medias
        const foundMedias = await this.searchMediasByRelativePaths(
          mediaRelativePaths,
          datasourceName
        )
        console.log(`Found ${notes.length} notes, ${foundMedias.length} medias`)
        const mediasByRelativePaths = new Map<string, Media>()
        foundMedias.forEach((media: Media) => mediasByRelativePaths.set(media.relativePath, media))

        // Append found medias on notes
        for (let i = 0; i < notes.length; i++) {
          const note = notes[i]
          if (!notesMediaRelativePaths.has(note.oid)) {
            // No medias for this note
            continue
          }

          const referencedMediaRelativePaths = notesMediaRelativePaths.get(note.oid)
          referencedMediaRelativePaths?.forEach((mediaRelativePath) => {
            const media = mediasByRelativePaths.get(mediaRelativePath)
            if (media) {
              note.medias.push(media)
            }
          })
        }
        resolve(notes)
      })
    })
  }

  async countNotesPerNationality(repositorySlugs: string[]): Promise<Map<string, number>> {
    const repositoryResults: Promise<Map<string, number>>[] = []
    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
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
                  console.log('Error while searching for statistics about nationalities', err)
                  reject(err)
                } else {
                  const result: Map<string, number> = new Map()
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i]
                    const { nationality } = row
                    const count = row.count_notes
                    result.set(nationality, count)
                  }
                  resolve(result)
                }
              }
            )
          })
        )
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      return new Promise<Map<string, number>>((resolve) => {
        const result: Map<string, number> = new Map()
        for (const repositoryResult of allRepositoryResults) {
          for (const [key, value] of repositoryResult) {
            if (!result.has(key)) {
              result.set(key, 0)
            }
            const prevValue = result.get(key) || 0
            result.set(key, prevValue + value)
          }
        }
        resolve(result)
      })
    })
  }

  async countNotesPerType(repositorySlugs: string[]): Promise<Map<string, number>> {
    const repositoryResults: Promise<Map<string, number>>[] = []
    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
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
                  console.log('Error while searching for statistics about kinds', err)
                  reject(err)
                } else {
                  const result: Map<string, number> = new Map()
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i]
                    const noteType = row.type
                    const count = row.count_notes
                    result.set(noteType, count)
                  }
                  resolve(result)
                }
              }
            )
          })
        )
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      return new Promise<Map<string, number>>((resolve) => {
        const result: Map<string, number> = new Map()
        for (const repositoryResult of allRepositoryResults) {
          for (const [key, value] of repositoryResult) {
            if (!result.has(key)) {
              result.set(key, 0)
            }
            const prevValue = result.get(key) || 0
            result.set(key, prevValue + value)
          }
        }
        resolve(result)
      })
    })
  }

  // Generic method to get note statistics with flexible groupBy and value parameters
  async getNoteStatistics(
    repositorySlugs: string[],
    query: string,
    groupBy: string,
    value?: string
  ): Promise<[string, number][]> {
    const repositoryResults: Promise<Array<[string, number]>>[] = []

    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
        }

        repositoryResults.push(
          new Promise<Array<[string, number]>>((resolve, reject) => {
            let sql: string

            const whereContent = queryPart2sql(query)

            const groupByColumn =
              groupBy === 'type' ? 'note_type' : `json_extract(attributes, '$.${groupBy}')`
            const countColumn =
              value && value !== '$count' ? `json_extract(attributes, '$.${value}')` : 'count(*)'

            if (value && value !== '$count') {
              // Query for specific value attribute
              sql = `
                SELECT
                  ${groupByColumn} as group_key,
                  ${countColumn} as count
                FROM note
                WHERE ${groupByColumn} IS NOT NULL
                  AND ${countColumn} IS NOT NULL
                  AND (${whereContent})
                GROUP BY ${groupByColumn}
              `
            } else {
              // Query for count
              sql = `
                SELECT
                  ${groupByColumn} as group_key,
                  count(*) as count
                FROM note
                WHERE ${groupByColumn} IS NOT NULL
                  AND (${whereContent})
                GROUP BY ${groupByColumn}
              `
            }

            console.log(sql)
            db.all(sql, (err: any, rows: any) => {
              if (err) {
                console.log('Error while getting note statistics', err)
                reject(err)
              } else {
                const result: Array<[string, number]> = []
                for (let i = 0; i < rows.length; i++) {
                  const row = rows[i]
                  const key = row.group_key as string
                  const val = row.count as number
                  result.push([key, val])
                }
                resolve(result)
              }
            })
          })
        )
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      // Merge results from all repositories
      const mergedMap: Map<string, number> = new Map()
      for (const repositoryResult of allRepositoryResults) {
        for (const [key, val] of repositoryResult) {
          if (!mergedMap.has(key)) {
            mergedMap.set(key, 0)
          }
          const prevValue = mergedMap.get(key) || 0
          mergedMap.set(key, prevValue + val)
        }
      }
      // Convert back to array of tuples
      const result: Array<[string, number]> = []
      for (const [key, val] of mergedMap) {
        result.push([key, val])
      }
      return result
    })
  }

  // Count objects by kind (tables: file, note, flashcard, reminder, goto, memory)
  async countObjects(repositorySlugs: string[]): Promise<Map<string, number>> {
    const repositoryResults: Promise<Map<string, number>>[] = []

    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
        }

        repositoryResults.push(
          new Promise<Map<string, number>>((resolve) => {
            const result: Map<string, number> = new Map()
            const tables = ['file', 'note', 'flashcard', 'reminder', 'goto', 'memory']

            const tablePromises = tables.map(
              (table) =>
                new Promise<void>((_resolve) => {
                  db.get(`SELECT COUNT(*) as count FROM ${table}`, (err: any, row: any) => {
                    if (err) {
                      console.log(`Error counting ${table}:`, err)
                    } else {
                      result.set(table, row.count)
                    }
                    _resolve()
                  })
                })
            )

            Promise.all(tablePromises)
              .then(() => {
                resolve(result)
                return result
              })
              .catch((error) => {
                console.error('Error counting objects:', error)
                resolve(result)
                return result
              })
          })
        )
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      const result: Map<string, number> = new Map()
      for (const repositoryResult of allRepositoryResults) {
        for (const [key, value] of repositoryResult) {
          if (!result.has(key)) {
            result.set(key, 0)
          }
          const prevValue = result.get(key) || 0
          result.set(key, prevValue + value)
        }
      }
      return result
    })
  }

  // Get media disk usage by directory
  async getMediasDiskUsage(repositorySlugs: string[]): Promise<MediaDirStat[]> {
    const repositoryResults: Promise<MediaDirStat[]>[] = []

    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
        }

        repositoryResults.push(
          new Promise<MediaDirStat[]>((resolve, reject) => {
            db.all(
              `
                SELECT
                  m.relative_path,
                  m.size
                FROM media m
              `,
              (err: any, rows: any) => {
                if (err) {
                  console.log('Error while getting media disk usage', err)
                  reject(err)
                } else {
                  const dirSizeMap = new Map<string, number>()
                  for (let i = 0; i < rows.length; i++) {
                    const row = rows[i]
                    const relativePath = path.dirname(row.relative_path) + '/'
                    const size = row.size || 0
                    dirSizeMap.set(relativePath, size)
                  }
                  const result: MediaDirStat[] = []
                  for (const [relativePath, size] of dirSizeMap) {
                    result.push({ relativePath, size })
                  }
                  resolve(result)
                }
              }
            )
          })
        )
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      // Merge results from all repositories
      const mergedMap: Map<string, number> = new Map()
      for (const repositoryResult of allRepositoryResults) {
        for (const stat of repositoryResult) {
          if (!mergedMap.has(stat.relativePath)) {
            mergedMap.set(stat.relativePath, 0)
          }
          const prevSize = mergedMap.get(stat.relativePath) || 0
          mergedMap.set(stat.relativePath, prevSize + stat.size)
        }
      }

      const result: MediaDirStat[] = []
      for (const [relativePath, size] of mergedMap) {
        result.push({ relativePath, size })
      }
      return result
    })
  }

  // Quote to display when no quote exists in the database
  defaultQuote(datasourceName: string): Note {
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
        '## Quote: On Writing\n\n> Writing is thinking. To write well is to think clearly. That’s why it’s so hard.\n>\n> ― David McCullough, American historian and author',
      body: '> Writing is thinking. To write well is to think clearly. That’s why it’s so hard.\n>\n> ― David McCullough, American historian and author',
      comment: '',
      medias: []
    }
  }

  async searchDailyQuote(query: Query): Promise<Note> {
    // Choose a datasource
    let selectedDatasourceName: string
    if (!query.repositories || query.repositories.length === 0) {
      selectedDatasourceName = randomElement([...this.datasources.keys()])
    } else if (query.repositories.length === 1) {
      selectedDatasourceName = query.repositories[0]
    } else {
      selectedDatasourceName = randomElement(query.repositories)
    }

    const db = this.datasources.get(selectedDatasourceName)
    if (!db) {
      throw new Error(`No datasource ${selectedDatasourceName} found`)
    }

    return new Promise<Note>((resolve, reject) => {
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
            items,
            marked,
            annotations
          FROM note
          WHERE note_type = 'Quote'
          ORDER BY RANDOM()
          LIMIT 1`,
        (err: any, rows: any) => {
          if (err) {
            console.log('Error while searching for a daily quote', err)
            reject(err)
          } else if (rows.length > 0) {
            // Return the first note as randomly ordered
            resolve(this.#rowToNote(rows[0], selectedDatasourceName))
          } else {
            resolve(this.defaultQuote(selectedDatasourceName))
          }
        }
      )
    })
  }

  async findByWikilink(repositorySlug: string, wikilink: string): Promise<Note> {
    const datasourceName = repositorySlug
    const db = this.datasources.get(datasourceName)
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`)
    }
    return new Promise<Note>((resolve, reject) => {
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
          items,
          marked,
          annotations
        FROM note
        WHERE wikilink LIKE '%${wikilink}'
      `
      db.get(sqlQuery, [], async (err: any, row: any) => {
        if (err) {
          console.log('Error while searching for note by wikilink', err)
          reject(err)
          return
        }
        const note = this.#rowToNote(row, datasourceName)
        const mediaRelativePaths = extractMediaRelativePaths(note)

        // Append found medias on note
        const foundMedias = await this.searchMediasByRelativePaths(
          mediaRelativePaths,
          datasourceName
        )
        note.medias.push(...foundMedias)

        resolve(note)
      })
    })
  }

  async find(noteRef: NoteRef): Promise<Note> {
    const datasourceName = noteRef.repositorySlug
    const db = this.datasources.get(datasourceName)
    if (!db) {
      throw new Error(`No datasource ${datasourceName} found`)
    }
    return new Promise<Note>((resolve, reject) => {
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
          items,
          marked,
          annotations
        FROM note
        WHERE oid = ?
      `
      db.get(sqlQuery, [noteRef.oid], async (err: any, row: any) => {
        if (err) {
          console.log('Error while searching for note by id', err)
          reject(err)
          return
        }
        const note = this.#rowToNote(row, datasourceName)
        const mediaRelativePaths = extractMediaRelativePaths(note)

        // Append found medias on note
        const foundMedias = await this.searchMediasByRelativePaths(
          mediaRelativePaths,
          datasourceName
        )
        note.medias.push(...foundMedias)

        resolve(note)
      })
    })
  }

  async multiFind(noteRefs: NoteRef[]): Promise<Note[]> {
    // Nothing to search
    if (noteRefs.length === 0) {
      return new Promise<Note[]>((resolve) => {
        resolve([])
      })
    }

    // Group OID by datasource
    const oidByRepository = new Map<string, string[]>()
    for (const noteRef of noteRefs) {
      if (!oidByRepository.has(noteRef.repositorySlug)) {
        oidByRepository.set(noteRef.repositorySlug, [])
      }
      oidByRepository.get(noteRef.repositorySlug)?.push(noteRef.oid)
    }

    // Trigger one query per datasource
    const results: Promise<Note[]>[] = []
    for (const [datasourceName, oids] of oidByRepository) {
      const db = this.datasources.get(datasourceName)
      if (!db) {
        throw new Error(`No datasource ${datasourceName} found`)
      }
      const result = new Promise<Note[]>((resolve, reject) => {
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
            items,
            marked,
            annotations
          FROM note
          WHERE oid IN ?
        `
        console.debug(`[${datasourceName}] ${sqlQuery}`)
        db.all(sqlQuery, [oids], async (err: any, rows: any) => {
          if (err) {
            console.log('Error while searching for notes by id', err)
            reject(err)
            return
          }

          const notes: Note[] = [] // The found notes
          const mediaRelativePaths: string[] = [] // The list of all medias found
          const notesMediaRelativePaths = new Map<string, string[]>() // The mapping of note <-> medias

          // Iterate over found notes and search for potential referenced medias
          for (let i = 0; i < rows.length; i++) {
            const note = this.#rowToNote(rows[i], datasourceName)
            const noteMediaRelativePaths = extractMediaRelativePaths(note)
            notesMediaRelativePaths.set(note.oid, noteMediaRelativePaths)
            mediaRelativePaths.push(...noteMediaRelativePaths)
            notes.push(note)
          }

          // Search for medias
          const foundMedias = await this.searchMediasByRelativePaths(
            mediaRelativePaths,
            datasourceName
          )
          const mediasByRelativePath = new Map<string, Media>()
          foundMedias.forEach((media) => mediasByRelativePath.set(media.relativePath, media))

          // Append found medias on notes
          for (let i = 0; i < notes.length; i++) {
            const note = notes[i]
            if (!notesMediaRelativePaths.has(note.oid)) {
              // No medias for this note
              continue
            }

            const referencedMediaRelativePaths = notesMediaRelativePaths.get(note.oid)
            referencedMediaRelativePaths?.forEach((mediaRelativePath) => {
              const media = mediasByRelativePath.get(mediaRelativePath)
              if (media) {
                note.medias.push(media)
              }
            })
          }
          resolve(notes)
        })
      })

      results.push(result)
    }

    return Promise.all(results).then((allNotes) => {
      return new Promise<Note[]>((resolve) => {
        let returnedNotes: Note[] = []
        for (const notes of allNotes) {
          returnedNotes = returnedNotes.concat(notes)
        }
        resolve(returnedNotes)
      })
    })
  }

  async search(query: Query): Promise<QueryResult> {
    const results: Promise<Note[]>[] = []
    for (const datasourceName of this.datasources.keys()) {
      if (
        !query.repositories ||
        query.repositories.length === 0 ||
        query.repositories.includes(datasourceName)
      ) {
        results.push(this.searchNotes(query.q, datasourceName, query.limit, query.shuffle))
      }
    }

    return Promise.all(results).then((allNotes) => {
      return new Promise<QueryResult>((resolve) => {
        let returnedNotes: Note[] = []
        for (const notes of allNotes) {
          returnedNotes = returnedNotes.concat(notes)
        }
        resolve({
          query,
          notes: returnedNotes
        })
      })
    })
  }

  async multiSearch(queries: Query[]): Promise<QueryResult[]> {
    const results: Promise<QueryResult>[] = []
    for (const query of queries) {
      results.push(this.search(query))
    }

    return Promise.all(results).then((allResults) => {
      return new Promise<QueryResult[]>((resolve) => {
        resolve(allResults)
      })
    })
  }

  /* Files Management */

  async listFiles(repositorySlugs: string[]): Promise<File[]> {
    const repositoryResults: Promise<File[]>[] = []
    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
        }

        repositoryResults.push(
          new Promise<File[]>((resolve, reject) => {
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
                  console.log('Error while listing files in database', err)
                  reject(err)
                } else {
                  const files: File[] = []
                  for (const row of rows) {
                    files.push(this.#rowToFile(row, datasourceName))
                  }
                  resolve(files)
                }
              }
            )
          })
        )
      }
    }

    return Promise.all(repositoryResults).then((allRepositoryResults) => {
      return new Promise<File[]>((resolve) => {
        const result: File[] = []
        for (const repositoryResult of allRepositoryResults) {
          result.push(...repositoryResult)
        }
        resolve(result)
      })
    })
  }

  async listNotesInFile(repositorySlug: string, relativePath: string): Promise<Note[]> {
    return this.searchNotes(`path:${relativePath}`, repositorySlug, 0, false)
  }

  /* Deck Management */

  async getDeckStats(repositorySlug: string, deckConfig: DeckConfig): Promise<StatsDeck> {
    const db = this.datasources.get(repositorySlug)
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`)
    }

    return new Promise<StatsDeck>((resolve, reject) => {
      let sql = `
        SELECT
          COUNT(CASE WHEN flashcard.due_at IS NOT NULL AND flashcard.due_at < '${calculateDueDate()}' THEN 1 END) as count_due,
          COUNT(CASE WHEN flashcard.due_at IS NULL OR flashcard.due_at = '' THEN 1 END) as count_new
        FROM note_fts JOIN note on note.oid = note_fts.oid
        JOIN flashcard on flashcard.note_oid = note.oid WHERE note.note_type='Flashcard'`
      const whereContent = queryPart2sql(deckConfig.query)
      if (whereContent) {
        sql += ` AND ${whereContent}`
      }
      sql += ';'

      db.get(sql, (err: any, row: any) => {
        if (err) {
          console.log('Error while searching for due flashcards', err)
          reject(err)
        } else {
          resolve({
            due: row.count_due,
            new: row.count_new
          })
        }
      })
    })
  }

  async getTodayFlashcards(repositorySlug: string, deckConfig: DeckConfig): Promise<Flashcard[]> {
    const db = this.datasources.get(repositorySlug)
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`)
    }

    return new Promise<Flashcard[]>((resolve, reject) => {
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
        `

      db.all(sql, (err: any, rows: any[]) => {
        if (err) {
          console.log('Error while searching for due flashcards', err)
          reject(err)
          return
        }

        const results: Flashcard[] = []
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const flashcard: Flashcard = {
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
            settings: JSON.parse(row.settings)
          }
          results.push(flashcard)
        }
        resolve(results)
      })
    })
  }

  async updateFlashcard(
    repositorySlug: string,
    _deckConfig: DeckConfig,
    flashcard: Flashcard
  ): Promise<Flashcard> {
    const db = this.datasources.get(repositorySlug)
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`)
    }

    return new Promise<Flashcard>((resolve, reject) => {
      // The NoteWriter Desktop only updates SRS fields.
      const data = [
        flashcard.dueAt,
        flashcard.studiedAt,
        JSON.stringify(flashcard.settings),
        flashcard.oid
      ]
      const sql = `UPDATE flashcard
                  SET
                    due_at = ?,
                    studied_at = ?,
                    settings = ?
                  WHERE oid = ?`
      db.run(sql, data, (err: any) => {
        if (err) {
          console.log('Error while searching for due flashcards', err)
          reject(err)
        } else {
          resolve(flashcard)
        }
      })
    })
  }

  /* Reminders and Memories Management */

  async getPendingReminders(repositorySlugs: string[], date?: Date): Promise<Reminder[]> {
    const targetDate = date || new Date()
    const sevenDaysFromTarget = new Date(targetDate.getTime() + 7 * 24 * 60 * 60 * 1000)

    const repositoryResults: Promise<Reminder[]>[] = []

    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
        }

        repositoryResults.push(
          new Promise<Reminder[]>((resolve, reject) => {
            // Get reminders expiring within 7 days
            const remindersSql = `
              SELECT oid, file_oid, note_oid, relative_path, description, tag, last_performed_at, next_performed_at
              FROM reminder
              WHERE next_performed_at <= '${sevenDaysFromTarget.toISOString()}'
              ORDER BY next_performed_at ASC
            `

            db.all(remindersSql, (err: any, reminderRows: any) => {
              if (err) {
                console.log('Error while fetching reminders', err)
                reject(err)
                return
              }

              const reminders = reminderRows.map((row: any) => ({
                oid: row.oid,
                fileOid: row.file_oid,
                noteOid: row.note_oid,
                relativePath: row.relative_path,
                description: row.description,
                tag: row.tag,
                lastPerformedAt: row.last_performed_at,
                nextPerformedAt: row.next_performed_at,
                repositorySlug: datasourceName,
                repositoryPath: this.#getRepositoryPath(datasourceName)
              }))

              resolve(reminders)
            })
          })
        )
      }
    }

    const results = await Promise.all(repositoryResults)
    return results.flat().sort((a, b) => {
      return new Date(a.nextPerformedAt).getTime() - new Date(b.nextPerformedAt).getTime()
    })
  }

  async getPastMemories(repositorySlugs: string[], date?: Date): Promise<Memory[]> {
    const targetDate = date || new Date()
    const targetMonth = targetDate.getMonth() + 1 // getMonth() is 0-based
    const targetDay = targetDate.getDate()

    const repositoryResults: Promise<Memory[]>[] = []

    for (const datasourceName of this.datasources.keys()) {
      if (repositorySlugs.length === 0 || repositorySlugs.includes(datasourceName)) {
        const db = this.datasources.get(datasourceName)
        if (!db) {
          throw new Error(`No datasource ${datasourceName} found`)
        }

        repositoryResults.push(
          new Promise<Memory[]>((resolve, reject) => {
            // Get memories that occurred almost the same date as today but in previous years (±7 days)
            const memoriesSql = `
              SELECT oid, note_oid, relative_path, text, occurred_at
              FROM memory
              WHERE
                occurred_at <= datetime('now') AND
                (
                  (strftime('%m', occurred_at) = '${targetMonth.toString().padStart(2, '0')}' AND
                   ABS(strftime('%d', occurred_at) - ${targetDay}) <= 7) OR
                  (strftime('%m', occurred_at) = '${(targetMonth === 1 ? 12 : targetMonth - 1).toString().padStart(2, '0')}' AND
                   strftime('%d', occurred_at) >= ${Math.max(1, targetDay - 7)} AND
                   ${targetDay} <= 7) OR
                  (strftime('%m', occurred_at) = '${(targetMonth === 12 ? 1 : targetMonth + 1).toString().padStart(2, '0')}' AND
                   strftime('%d', occurred_at) <= ${Math.min(31, targetDay + 7)} AND
                   ${targetDay} >= 24)
                )
              ORDER BY occurred_at DESC
            `

            db.all(memoriesSql, (err: any, memoryRows: any) => {
              if (err) {
                console.log('Error while fetching memories', err)
                reject(err)
                return
              }

              const memories = memoryRows.map((row: any) => ({
                oid: row.oid,
                noteOid: row.note_oid,
                relativePath: row.relative_path,
                text: row.text,
                occurredAt: row.occurred_at,
                repositorySlug: datasourceName,
                repositoryPath: this.#getRepositoryPath(datasourceName)
              }))

              resolve(memories)
            })
          })
        )
      }
    }

    const results = await Promise.all(repositoryResults)
    return results.flat().sort((a, b) => {
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    })
  }

  async updateReminder(
    repositorySlug: string,
    reminderOid: string,
    nextPerformedAt: Date
  ): Promise<Reminder> {
    const db = this.datasources.get(repositorySlug)
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`)
    }

    return new Promise<Reminder>((resolve, reject) => {
      const updateSql = `
        UPDATE reminder
        SET next_performed_at = ?, last_performed_at = datetime('now')
        WHERE oid = ?
      `

      db.run(updateSql, [nextPerformedAt.toISOString(), reminderOid], (err: any) => {
        if (err) {
          console.error('Error updating reminder:', err)
          reject(err)
          return
        }

        // Fetch the updated reminder
        const selectSql = `
          SELECT oid, file_oid, note_oid, relative_path, description, tag, last_performed_at, next_performed_at
          FROM reminder
          WHERE oid = ?
        `

        db.get(selectSql, [reminderOid], (err: any, row: any) => {
          if (err) {
            console.error('Error fetching updated reminder:', err)
            reject(err)
            return
          }

          if (!row) {
            reject(new Error(`Reminder ${reminderOid} not found`))
            return
          }

          const updatedReminder: Reminder = {
            oid: row.oid,
            fileOid: row.file_oid,
            noteOid: row.note_oid,
            relativePath: row.relative_path,
            description: row.description,
            tag: row.tag,
            lastPerformedAt: row.last_performed_at,
            nextPerformedAt: row.next_performed_at,
            repositorySlug,
            repositoryPath: this.#getRepositoryPath(repositorySlug)
          }

          resolve(updatedReminder)
        })
      })
    })
  }

  /* Journal Management */

  async determineJournalActivity(
    repositorySlug: string,
    pathPrefix: string
  ): Promise<JournalActivity> {
    const db = this.datasources.get(repositorySlug)
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`)
    }

    return new Promise<JournalActivity>((resolve, reject) => {
      const sql = `
        SELECT
          MIN(json_extract(attributes, '$.date')) as minDate,
          MAX(json_extract(attributes, '$.date')) as maxDate,
          COUNT(*) as countEntries
        FROM note
        WHERE note_type = 'Journal'
          AND json_extract(attributes, '$.date') IS NOT NULL
          AND relative_path LIKE ?
      `

      db.get(sql, [`${pathPrefix}%`], (err: any, row: any) => {
        if (err) {
          console.log('Error while determining journal activity', err)
          reject(err)
        } else {
          resolve({
            minDate: row.minDate || null,
            maxDate: row.maxDate || null,
            countEntries: row.countEntries || 0
          })
        }
      })
    })
  }

  async findJournalEntries(
    repositorySlug: string,
    pathPrefix: string,
    start: string,
    end: string
  ): Promise<ParentNote[]> {
    const db = this.datasources.get(repositorySlug)
    if (!db) {
      throw new Error(`No datasource ${repositorySlug} found`)
    }

    return new Promise<ParentNote[]>((resolve, reject) => {
      const sql = `
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
          tags,
          line,
          content,
          body,
          comment,
          items,
          marked,
          annotations
        FROM note
        WHERE note_type = 'Journal'
          AND json_extract(attributes, '$.date') >= ?
          AND json_extract(attributes, '$.date') <= ?
          AND relative_path LIKE ?
        ORDER BY json_extract(attributes, '$.date') DESC
      `

      db.all(sql, [start, end, `${pathPrefix}%`], async (err: any, rows: any) => {
        if (err) {
          console.log('Error while finding journal entries', err)
          reject(err)
          return
        }

        const notes: Note[] = []
        for (let i = 0; i < rows.length; i++) {
          const note = this.#rowToNote(rows[i], repositorySlug)
          notes.push(note)
        }

        const notesWithMedias = await this.enrichNotesWithMedias(repositorySlug, notes)
        const notesWithMediasAndDailyNotes = await this.enrichNotesWithDailyNotes(
          repositorySlug,
          notesWithMedias
        )

        resolve(notesWithMediasAndDailyNotes)
      })
    })
  }

  /* Enrichers */

  // For each journal note, find daily notes linked to it
  async enrichNotesWithDailyNotes(repositorySlug: string, notes: Note[]): Promise<ParentNote[]> {
    const notesWithDailyNotes: ParentNote[] = []

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]
      if (note.type === 'Journal' && note.attributes && note.attributes.date) {
        const allDailyNotes = await this.searchNotes(
          `path:'${note.relativePath}' @date:${note.attributes.date}`,
          repositorySlug,
          10,
          false
        )
        notesWithDailyNotes.push({
          parent: note,
          children: allDailyNotes.filter((n) => n.type !== 'Journal') // Remove journal entry present in 'parent'
        })
      }
    }

    return notesWithDailyNotes
  }

  // For each note, find medias linked to it
  async enrichNotesWithMedias(repositorySlug: string, notes: Note[]): Promise<Note[]> {
    // Collect information about medias in notes
    const mediaRelativePaths: string[] = []
    const notesMediaRelativePaths = new Map<string, string[]>()
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]
      const noteMediaRelativePaths = extractMediaRelativePaths(note)
      notesMediaRelativePaths.set(note.oid, noteMediaRelativePaths)
      mediaRelativePaths.push(...noteMediaRelativePaths)
    }

    // Search for medias
    const foundMedias = await this.searchMediasByRelativePaths(mediaRelativePaths, repositorySlug)
    const mediasByRelativePaths = new Map<string, Media>()
    foundMedias.forEach((media: Media) => mediasByRelativePaths.set(media.relativePath, media))

    // Append found medias on notes
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]
      if (!notesMediaRelativePaths.has(note.oid)) {
        continue
      }

      const referencedMediaRelativePaths = notesMediaRelativePaths.get(note.oid)
      referencedMediaRelativePaths?.forEach((mediaRelativePath) => {
        const media = mediasByRelativePaths.get(mediaRelativePath)
        if (media) {
          note.medias.push(media)
        }
      })
    }

    return notes
  }

  /* Converters */

  #rowToFile(row: any, repositorySlug: string): File {
    return {
      oid: row.oid,
      repositorySlug,
      repositoryPath: this.#getRepositoryPath(repositorySlug),
      slug: row.slug,
      relativePath: row.relative_path,
      wikilink: row.wikilink,
      title: row.title,
      shortTitle: row.short_title
    }
  }

  #rowToNote(row: any, repositorySlug: string): Note {
    console.log(row) // FIXME remove
    let parsedTags = []
    if (row.tags !== '') parsedTags = row.tags.split(',')
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
      annotations: JSON.parse(row.annotations) as Annotation[],
      content: row.content,
      body: row.body,
      comment: row.comment,
      items: row.items ? (JSON.parse(row.items) as Items) : undefined,
      medias: []
    }
  }
}

/* Parsing */

export function readStringValue(q: string): [string, string] {
  const firstCharacter = q.charAt(0)

  if (firstCharacter === "'") {
    const closingQuoteIndex = q.indexOf("'", 1)
    if (closingQuoteIndex === -1) {
      throw new Error(`missing "'" in query`)
    }
    const value = q.substring(1, closingQuoteIndex)
    if (closingQuoteIndex === q.length - 1) {
      return [value, '']
    }
    return [value, q.substring(closingQuoteIndex + 1).trim()]
  }

  if (firstCharacter === '"') {
    const closingQuoteIndex = q.indexOf('"', 1)
    if (closingQuoteIndex === -1) {
      throw new Error(`missing '"' in query`)
    }
    const value = q.substring(1, closingQuoteIndex)
    if (closingQuoteIndex === q.length - 1) {
      return [value, '']
    }
    return [value, q.substring(closingQuoteIndex + 1).trim()]
  }

  // just read until next blank
  const nextSpaceIndex = q.indexOf(' ')
  if (nextSpaceIndex === -1) {
    return [q, '']
  }
  const value = q.substring(0, nextSpaceIndex)
  if (nextSpaceIndex === q.length - 1) {
    return [value, '']
  }
  return [value, q.substring(nextSpaceIndex + 1).trim()]
}

function queryPart2sql(qParent: string): string {
  const queryPart2sqlInner = (q: string): string => {
    const query = q.trim()

    if (query === '') {
      // Match all records with a "dummy" condition
      return '1=1';
    }

    if (query.startsWith('(')) {
      // Find closing parenthesis
      let countOpening = 0
      for (let i = 0; i < query.length; i++) {
        if (query.charAt(i) === '(') {
          countOpening++
        } else if (query.charAt(i) === ')') {
          countOpening--
          if (countOpening === 0) {
            let sql = `(${queryPart2sqlInner(query.substring(1, i))})`
            if (i < query.length - 1) {
              sql += ` AND ${queryPart2sqlInner(query.substring(i + 1))}`
            }
            return sql
          }
        }
      }
      throw new Error("missing ')' in query")
    }

    if (query.startsWith('#')) {
      const i = query.indexOf(' ')
      if (i === -1) {
        return `note.tags LIKE '%${query.substring(1)}%'`
      }
      // eslint-disable-next-line prettier/prettier
      return `note.tags LIKE '%${query.substring(1, i)}%' AND ${queryPart2sqlInner(query.substring(i + 1))}`;
    }

    if (query.startsWith('OR ') || query.startsWith('or ')) {
      return `OR ${queryPart2sqlInner(query.substring(3))}`
    }
    if (query.startsWith('AND ') || query.startsWith('and ')) {
      return `AND ${queryPart2sqlInner(query.substring(3))}`
    }

    if (query.startsWith('path:')) {
      const subQuery = query.substring('path:'.length)
      const [value, remainingQuery] = readStringValue(subQuery)
      let sql = `note.relative_path LIKE '${value}%'`
      if (remainingQuery) {
        sql += ` AND ${queryPart2sqlInner(remainingQuery)}`
      }
      return sql
    }

    if (query.startsWith('@type:')) {
      const nextSpaceIndex = query.indexOf(' ')
      let noteType = ''
      let remainingQuery
      if (nextSpaceIndex === -1) {
        noteType = query.substring('@type:'.length)
      } else {
        noteType = query.substring('@type:'.length, nextSpaceIndex)
        remainingQuery = query.substring(nextSpaceIndex)
      }
      let sql = `note.note_type='${noteType}'`
      if (remainingQuery) {
        sql += ` AND ${queryPart2sqlInner(remainingQuery)}`
      }
      return sql
    }

    if (query.startsWith('@')) {
      const nextColonIndex = query.indexOf(':')
      if (nextColonIndex === -1) {
        throw new Error(`missing ':' in query`)
      }
      const name = query.substring(1, nextColonIndex)
      const subQuery = query.substring(nextColonIndex + 1)
      const [value, remainingQuery] = readStringValue(subQuery)
      let sql = `json_extract(note.attributes, "$.${name}") = "${value}"`
      if (remainingQuery) {
        sql += ` AND ${queryPart2sqlInner(remainingQuery)}`
      }
      return sql
    }

    // Or just a text to match
    const [value, remainingQuery] = readStringValue(query)
    let sql = `note_fts MATCH '${value}'`
    if (remainingQuery) {
      sql += ` AND ${queryPart2sqlInner(remainingQuery)}`
    }
    return sql
  }

  let result = queryPart2sqlInner(qParent)
  // Fix a bug in logic as we systematically append 'AND' when the query is not
  // completely parsed even if the following keyword is 'OR'
  result = result.replace('AND OR', 'OR')
  return result
}

export function query2sql(q: string, limit: number, shuffle: boolean): string {
  const whereContent = queryPart2sql(q)
  const fields =
    'note.oid, note.file_oid, note.note_type, note.slug, note.relative_path, note.wikilink, note.attributes, note.tags, note.line, note.title, note.short_title, note.long_title, note.content, note.body, note.comment, note.items, note.marked, note.annotations'
  let sql = `SELECT ${fields} FROM note_fts JOIN note on note.oid = note_fts.oid`
  if (whereContent) {
    sql += ` WHERE ${whereContent}`
  }
  if (shuffle) {
    sql += ` ORDER BY RANDOM()`
  }
  if (limit > 0) {
    sql += ` LIMIT ${limit}`
  }
  sql += ';'
  return sql
}

export function calculateDueDate(): string {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const dueDate = now.toISOString() // Ex: "2006-01-02T15:04:05.999999999Z07:00"
  return dueDate
}
