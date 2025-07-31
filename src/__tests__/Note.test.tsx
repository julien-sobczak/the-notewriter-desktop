import { Note } from '../shared/Model';
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

<media relative-path="pic.jpeg" />`;
    const note: Note = createNoteFromContent(content);
    note.medias.push({
      oid: '7495f870749a85228fbaf1101775448ddfe4d50e',
      kind: 'picture',
      relativePath: 'pic.jpeg',
      extension: 'jpeg',
      blobs: [
        {
          oid: '91cc7e00705770801948780fc639ad6d95db087a',
          mimeType: 'image/avif',
          attributes: {},
          tags: ['preview', 'lossy'],
        },
        {
          oid: '808263e6d73dfe907317bf7869e0512268221fca',
          mimeType: 'image/avif',
          attributes: {},
          tags: ['large', 'lossy'],
        },
      ],
    });

    const actual = formatContent(note, ['large']);
    const expected = `
<h1>A note</h1>

This is a basic note with an image.

<img src="file:~/notes/.nt/objects/80/808263e6d73dfe907317bf7869e0512268221fca.blob" alt="" title="" />`;

    expect(actual).toBe(expected);
  });

  it('should support videos', () => {
    const content = `
<h1>A note</h1>

This is a basic note with a video.

<media relative-path="video.mp4" />`;
    const note: Note = createNoteFromContent(content);
    note.medias.push({
      oid: '7495f870749a85228fbaf1101775448ddfe4d50e',
      kind: 'video',
      relativePath: 'video.mp4',
      extension: 'mp4',
      blobs: [
        {
          oid: '91cc7e00705770801948780fc639ad6d95db087a',
          mimeType: 'image/avif',
          attributes: {},
          tags: ['preview', 'lossy'],
        },
        {
          oid: '808263e6d73dfe907317bf7869e0512268221fca',
          mimeType: 'video/webm',
          attributes: {},
          tags: ['original', 'lossy'],
        },
      ],
    });

    const actual = formatContent(note, ['large']);
    const expected = `
<h1>A note</h1>

This is a basic note with a video.

<video controls title=""><source src="file:~/notes/.nt/objects/80/808263e6d73dfe907317bf7869e0512268221fca.blob" type="video/webm"></video>`;

    expect(actual).toBe(expected);
  });

  it('should support audios', () => {
    const content = `
<h1>A note</h1>

This is a basic note with an audio.

<media relative-path="audio.mp3" />`;
    const note: Note = createNoteFromContent(content);
    note.medias.push({
      oid: '7495f870749a85228fbaf1101775448ddfe4d50e',
      kind: 'audio',
      relativePath: 'audio.mp3',
      extension: 'mp3',
      blobs: [
        {
          oid: '808263e6d73dfe907317bf7869e0512268221fca',
          mimeType: 'audio/mpeg',
          attributes: {},
          tags: ['original', 'lossy'],
        },
      ],
    });

    const actual = formatContent(note, ['large']);
    const expected = `
<h1>A note</h1>

This is a basic note with an audio.

<audio controls title=""><source src="file:~/notes/.nt/objects/80/808263e6d73dfe907317bf7869e0512268221fca.blob" type="audio/mpeg"></audio>`;

    expect(actual).toBe(expected);
  });

  it('should support documents', () => {
    const content = `
<h1>A note</h1>

This is a basic note with a document link.

<media relative-path="doc.pdf" />`;
    const note: Note = createNoteFromContent(content);
    note.medias.push({
      oid: '7495f870749a85228fbaf1101775448ddfe4d50e',
      kind: 'document',
      relativePath: 'doc.pdf',
      extension: 'pdf',
      blobs: [
        {
          oid: '91cc7e00705770801948780fc639ad6d95db087a',
          mimeType: 'application/pdf',
          attributes: {},
          tags: ['original', 'lossless'],
        },
      ],
    });

    const actual = formatContent(note, ['large']);
    const expected = `
<h1>A note</h1>

This is a basic note with a document link.

<a target="_blank" href="file:~/notes/.nt/objects/91/91cc7e00705770801948780fc639ad6d95db087a.blob" title="">link</a>`;

    expect(actual).toBe(expected);
  });

  it('should use a default image for missing media', () => {
    const content = `
<h1>A note</h1>

This is a basic note with an image.

<media relative-path="unknown.png" />`;
    const note: Note = createNoteFromContent(content);
    note.medias = []; // no matching media

    const actual = formatContent(note);
    const expected = `
<h1>A note</h1>

This is a basic note with an image.

<img src="test-file-stub" class="missing" />`; // 404.svg

    expect(actual).toBe(expected);
  });
});

/* Test Helpers */

function createNoteFromContent(content: string): Note {
  return {
    oid: '7882294f4775c64ea059171387d750ea532a15d4',
    oidFile: '97fa3e4447e15b348fbe7ee2639092eda87ebbac',
    repositorySlug: 'Personal',
    repositoryPath: '~/notes',
    slug: 'dummy',
    type: 'note',
    relativePath: 'note.md',
    wikilink: 'note',
    attributes: {},
    tags: [],
    line: 1,
    title: 'Dummy',
    shortTitle: 'Dummy',
    longTitle: 'Dummy',
    content,
    body: content,
    comment: '',
    medias: [],
    marked: false,
    annotations: [],
  };
}
