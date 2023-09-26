import { Note } from 'shared/model/Note';
import { formatContent } from '../renderer/RenderedNote';

describe('formatContent', () => {
  it('should return the HTML content', () => {
    const content = `
<h1>A note</h1>

This is a basic note.`;
    const note: Note = createNoteFromContent(content);
    expect(formatContent(note)).toBe(content);
  });

  it('should replace media with their path', () => {
    const content = `
<h1>A note</h1>

This is a basic note with an image.

<img src="oid:7495f870749a85228fbaf1101775448ddfe4d50e" />`;
    const note: Note = createNoteFromContent(content);
    note.medias.push({
      oid: '7495f870749a85228fbaf1101775448ddfe4d50e',
      kind: 'picture',
      blobs: [
        {
          oid: '91cc7e00705770801948780fc639ad6d95db087a',
          mime: 'image/avif',
          tags: ['preview', 'lossy'],
        },
        {
          oid: '808263e6d73dfe907317bf7869e0512268221fca',
          mime: 'image/avif',
          tags: ['large', 'lossy'],
        },
      ],
    });

    const actual = formatContent(note, ['large']);
    const expected = `
<h1>A note</h1>

This is a basic note with an image.

<img src="file:~/notes/.nt/objects/80/808263e6d73dfe907317bf7869e0512268221fca" />`;

    expect(actual).toBe(expected);
  });

  it('should use a default image for missing media', () => {
    const content = `
<h1>A note</h1>

This is a basic note with an image.

<img src="oid:4044044044044044044044044044044044044040" />`;
    const note: Note = createNoteFromContent(content);
    note.medias = []; // no matching media

    const actual = formatContent(note);
    const expected = `
<h1>A note</h1>

This is a basic note with an image.

<img src="test-file-stub" />`; // 404.svg

    expect(actual).toBe(expected);
  });
});

/* Test Helpers */

function createNoteFromContent(html: string): Note {
  return {
    oid: '7882294f4775c64ea059171387d750ea532a15d4',
    oidFile: '97fa3e4447e15b348fbe7ee2639092eda87ebbac',
    workspaceSlug: 'Personal',
    workspacePath: '~/notes',
    kind: 'note',
    relativePath: 'note.md',
    wikilink: 'note',
    attributes: {},
    tags: [],
    line: 1,
    title: 'Dummy',
    content: html,
    comment: '',
    medias: [],
  };
}
