import { formatContent, WithMedias } from './markdown'

function makeHolder(
  medias: WithMedias['medias'] = [],
  repositoryPath = '/repo'
): WithMedias {
  return { medias, repositoryPath }
}

describe('formatContent', () => {
  it('returns content unchanged when there are no media tags', () => {
    const content = '# Hello\n\nSome text without medias.'
    expect(formatContent(makeHolder(), content)).toBe(content)
  })

  it('replaces a missing media tag with a missing image placeholder', () => {
    const content = '<media relative-path="images/photo.jpg" />'
    const result = formatContent(makeHolder(), content)
    expect(result).toContain('<img')
    expect(result).toContain('class="missing"')
  })

  it('renders a picture media as an <img> tag', () => {
    const holder = makeHolder([
      {
        oid: 'abcdef1234567890',
        relativePath: 'images/photo.jpg',
        kind: 'picture',
        extension: 'jpg',
        blobs: [
          {
            oid: 'blob0011223344556677',
            mimeType: 'image/jpeg',
            attributes: {},
            tags: []
          }
        ]
      }
    ])
    const content = '<media relative-path="images/photo.jpg" alt="My photo" title="Photo title" />'
    const result = formatContent(holder, content)
    expect(result).toContain('<img')
    expect(result).toContain('alt="My photo"')
    expect(result).toContain('title="Photo title"')
    expect(result).toContain('blob0011223344556677.blob')
    expect(result).toContain('/repo/.nt/objects/')
  })

  it('renders an audio media as an <audio> tag', () => {
    const holder = makeHolder([
      {
        oid: 'mediaaudio1234567890',
        relativePath: 'audio/track.mp3',
        kind: 'audio',
        extension: 'mp3',
        blobs: [
          {
            oid: 'blobaudio112233445566',
            mimeType: 'audio/mpeg',
            attributes: {},
            tags: []
          }
        ]
      }
    ])
    const content = '<media relative-path="audio/track.mp3" />'
    const result = formatContent(holder, content)
    expect(result).toContain('<audio')
    expect(result).toContain('audio/mpeg')
    expect(result).toContain('blobaudio112233445566.blob')
  })

  it('renders a video media as a <video> tag', () => {
    const holder = makeHolder([
      {
        oid: 'mediavideo1234567890',
        relativePath: 'video/clip.mp4',
        kind: 'video',
        extension: 'mp4',
        blobs: [
          {
            oid: 'blobvideo112233445566',
            mimeType: 'video/mp4',
            attributes: {},
            tags: []
          }
        ]
      }
    ])
    const content = '<media relative-path="video/clip.mp4" />'
    const result = formatContent(holder, content)
    expect(result).toContain('<video')
    expect(result).toContain('video/mp4')
    expect(result).toContain('blobvideo112233445566.blob')
  })

  it('renders an unknown media kind as an <a> link', () => {
    const holder = makeHolder([
      {
        oid: 'mediadoc1234567890ab',
        relativePath: 'docs/file.pdf',
        kind: 'document',
        extension: 'pdf',
        blobs: [
          {
            oid: 'blobdoc1122334455667788',
            mimeType: 'application/pdf',
            attributes: {},
            tags: []
          }
        ]
      }
    ])
    const content = '<media relative-path="docs/file.pdf" title="My PDF" />'
    const result = formatContent(holder, content)
    expect(result).toContain('<a ')
    expect(result).toContain('blobdoc1122334455667788.blob')
  })

  it('selects the blob matching requested tags', () => {
    const holder = makeHolder([
      {
        oid: 'mediatagged123456789',
        relativePath: 'images/photo.jpg',
        kind: 'picture',
        extension: 'jpg',
        blobs: [
          {
            oid: 'bloboriginal11223344',
            mimeType: 'image/jpeg',
            attributes: {},
            tags: []
          },
          {
            oid: 'blobpreview112233445',
            mimeType: 'image/jpeg',
            attributes: {},
            tags: ['preview']
          }
        ]
      }
    ])
    const content = '<media relative-path="images/photo.jpg" />'

    const resultOriginal = formatContent(holder, content)
    expect(resultOriginal).toContain('bloboriginal11223344.blob')

    const resultPreview = formatContent(holder, content, ['preview'])
    expect(resultPreview).toContain('blobpreview112233445.blob')
  })

  it('replaces multiple media tags in a single content string', () => {
    const holder = makeHolder([
      {
        oid: 'mediapic1234567890ab',
        relativePath: 'images/a.jpg',
        kind: 'picture',
        extension: 'jpg',
        blobs: [{ oid: 'blobpica1122334455667', mimeType: 'image/jpeg', attributes: {}, tags: [] }]
      },
      {
        oid: 'mediapic2234567890ab',
        relativePath: 'images/b.jpg',
        kind: 'picture',
        extension: 'jpg',
        blobs: [{ oid: 'blobpicb1122334455667', mimeType: 'image/jpeg', attributes: {}, tags: [] }]
      }
    ])
    const content =
      'First: <media relative-path="images/a.jpg" />\nSecond: <media relative-path="images/b.jpg" />'
    const result = formatContent(holder, content)
    expect(result).toContain('blobpica1122334455667.blob')
    expect(result).toContain('blobpicb1122334455667.blob')
  })
})

