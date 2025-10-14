import { readStringValue, query2sql } from './database'

const fields =
  'note.oid, note.file_oid, note.note_type, note.slug, note.relative_path, note.wikilink, note.attributes, note.tags, note.line, note.title, note.short_title, note.long_title, note.content, note.body, note.comment, note.marked, note.annotations'
const selectClause = `SELECT ${fields} FROM note_fts JOIN note on note.oid = note_fts.oid`

beforeEach(() => {})

afterEach(() => {})

describe('readStringValue', () => {
  test('various simple values', async () => {
    expect(readStringValue('dummy')).toEqual(['dummy', ''])
    expect(readStringValue(`'dummy'`)).toEqual(['dummy', ''])
    expect(readStringValue(`"dummy"`)).toEqual(['dummy', ''])
  })

  test('various values with spaces', async () => {
    expect(readStringValue('dummy value')).toEqual(['dummy', 'value'])
    expect(readStringValue(`'dummy value'`)).toEqual(['dummy value', ''])
    expect(readStringValue(`"dummy value"`)).toEqual(['dummy value', ''])
  })

  test('with remaining values', async () => {
    expect(readStringValue('dummy value1 value2')).toEqual(['dummy', 'value1 value2'])
    expect(readStringValue(`'dummy value1' value2`)).toEqual(['dummy value1', 'value2'])
    expect(readStringValue(`"dummy value1" value2`)).toEqual(['dummy value1', 'value2'])
  })
})

describe('query2sql', () => {
  test('various queries', async () => {
    expect(query2sql('#life', 0, false)).toBe(`${selectClause} WHERE note.tags LIKE '%life%';`)
    expect(query2sql('#life @name:value', 0, false)).toBe(
      `${selectClause} WHERE note.tags LIKE '%life%' AND json_extract(note.attributes, "$.name") = "value";`
    )
    expect(query2sql('#life @name:"a long value"', 0, false)).toBe(
      `${selectClause} WHERE note.tags LIKE '%life%' AND json_extract(note.attributes, "$.name") = "a long value";`
    )
    expect(query2sql('path:references/books OR path:projects/', 0, false)).toBe(
      `${selectClause} WHERE note.relative_path LIKE 'references/books%' OR note.relative_path LIKE 'projects/%';`
    )
    expect(query2sql('@type:quote (#life #life-changing)', 0, false)).toBe(
      `${selectClause} WHERE note.note_type='quote' AND (note.tags LIKE '%life%' AND note.tags LIKE '%life-changing%');`
    )
    expect(query2sql('@type:note basic keyword', 0, false)).toBe(
      `${selectClause} WHERE note.note_type='note' AND note_fts MATCH 'basic' AND note_fts MATCH 'keyword';`
    )
    expect(query2sql('"basic keyword" @type:note', 0, false)).toBe(
      `${selectClause} WHERE note_fts MATCH 'basic keyword' AND note.note_type='note';`
    )
    expect(query2sql('path:references/persons (#life or #purpose) @type:quote', 0, false)).toBe(
      `${selectClause} WHERE note.relative_path LIKE 'references/persons%' AND (note.tags LIKE '%life%' OR note.tags LIKE '%purpose%') AND note.note_type='quote';`
    )
  })

  test('with limit', async () => {
    expect(query2sql('#life', 10, false)).toBe(
      `${selectClause} WHERE note.tags LIKE '%life%' LIMIT 10;`
    )
    expect(query2sql('#life', 0, false)).toBe(`${selectClause} WHERE note.tags LIKE '%life%';`)
  })

  test('with shuffling', async () => {
    expect(query2sql('#life', 10, true)).toBe(
      `${selectClause} WHERE note.tags LIKE '%life%' ORDER BY RANDOM() LIMIT 10;`
    )
    expect(query2sql('#life', 0, false)).toBe(`${selectClause} WHERE note.tags LIKE '%life%';`)
    expect(query2sql('#life', 0, true)).toBe(
      `${selectClause} WHERE note.tags LIKE '%life%' ORDER BY RANDOM();`
    )
  })
})
