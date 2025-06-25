import { extractSourceURL, Note } from './Model';

const dummyNote: Note = {
  oid: '473132b3cc4947b2ac1b197a1f36866f96c45516',
  oidFile: 'file1',
  slug: 'slug1',
  repositorySlug: 'repo1',
  repositoryPath: '~/repo1',
  type: 'Note',
  title: 'Title',
  shortTitle: 'Short Title',
  longTitle: 'Long Title',
  relativePath: 'notes/note.md',
  wikilink: '[[note]]',
  attributes: {},
  tags: [],
  line: 1,
  content: '',
  body: '',
  comment: '',
  marked: false,
  annotations: [],
  medias: [],
};

describe('extractSourceURL', () => {
  it('returns undefined if there is no source attribute', () => {
    const note: Note = { ...dummyNote, attributes: { foo: 'bar' } };
    expect(extractSourceURL(note)).toBeUndefined();
  });

  it('returns undefined if source attribute is not a string', () => {
    const note: Note = { ...dummyNote, attributes: { source: 123 } };
    expect(extractSourceURL(note)).toBeUndefined();
  });

  it('returns the URL if source attribute is a plain URL', () => {
    const url = 'https://example.com/resource';
    const note: Note = { ...dummyNote, attributes: { source: url } };
    expect(extractSourceURL(note)).toBe(url);
  });

  it('extracts the URL from a markdown link', () => {
    const url = 'https://example.com/resource';
    const note: Note = {
      ...dummyNote,
      attributes: { source: `[Alt](${url} "Title")` },
    };
    expect(extractSourceURL(note)).toBe(url);
  });

  it('extracts the first URL if multiple URLs are present', () => {
    const url1 = 'https://first.com';
    const url2 = 'https://second.com';
    const note: Note = {
      ...dummyNote,
      attributes: { source: `${url1} and ${url2}` },
    };
    expect(extractSourceURL(note)).toBe(url1);
  });

  it('extracts URL even if surrounded by extra text', () => {
    const url = extractSourceURL({
      ...dummyNote,
      attributes: { source: `See this: https://example.com for more info.` },
    });
    expect(url).toBe('https://example.com');
  });

  it('returns undefined if source attribute does not contain a URL', () => {
    const note: Note = { ...dummyNote, attributes: { source: 'no url here' } };
    expect(extractSourceURL(note)).toBeUndefined();
  });
});
