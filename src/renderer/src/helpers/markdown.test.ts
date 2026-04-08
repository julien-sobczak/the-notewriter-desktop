import { Media } from '@renderer/Model'
import { replaceMediasByLinks } from './markdown'

function makeMedias(medias: Media[] = []): Media[] {
  return medias
}

describe('replaceMediasByLinks', () => {
  it('returns content unchanged when there are no media tags', () => {
    const content = '# Hello\n\nSome text without medias.'
    expect(replaceMediasByLinks(content, makeMedias())).toBe(content)
  })

  it('replaces a missing media tag with a missing image placeholder', () => {
    const content = '<media relative-path="images/photo.jpg" />'
    const result = replaceMediasByLinks(content, makeMedias())
    expect(result).toContain('<img')
    expect(result).toContain('class="missing"')
  })

  it('renders a picture media as an <img> tag', () => {
    const medias = makeMedias([
      {
        oid: 'abcdef1234567890',
        relativePath: 'images/photo.jpg',
        repositoryPath: '/repo',
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
    const result = replaceMediasByLinks(content, medias)
    expect(result).toContain('<img')
    expect(result).toContain('alt="My photo"')
    expect(result).toContain('title="Photo title"')
    expect(result).toContain('blob0011223344556677.blob')
    expect(result).toContain('/repo/.nt/objects/')
  })

  it('renders an audio media as an <audio> tag', () => {
    const medias = makeMedias([
      {
        oid: 'mediaaudio1234567890',
        relativePath: 'audio/track.mp3',
        repositoryPath: '/repo',
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
    const result = replaceMediasByLinks(content, medias)
    expect(result).toContain('<audio')
    expect(result).toContain('audio/mpeg')
    expect(result).toContain('blobaudio112233445566.blob')
  })

  it('renders a video media as a <video> tag', () => {
    const medias = makeMedias([
      {
        oid: 'mediavideo1234567890',
        relativePath: 'video/clip.mp4',
        repositoryPath: '/repo',
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
    const result = replaceMediasByLinks(content, medias)
    expect(result).toContain('<video')
    expect(result).toContain('video/mp4')
    expect(result).toContain('blobvideo112233445566.blob')
  })

  it('renders an unknown media kind as an <a> link', () => {
    const medias = makeMedias([
      {
        oid: 'mediadoc1234567890ab',
        relativePath: 'docs/file.pdf',
        repositoryPath: '/repo',
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
    const result = replaceMediasByLinks(content, medias)
    expect(result).toContain('<a ')
    expect(result).toContain('blobdoc1122334455667788.blob')
  })

  it('selects the blob matching requested tags', () => {
    const medias = makeMedias([
      {
        oid: 'mediatagged123456789',
        relativePath: 'images/photo.jpg',
        repositoryPath: '/repo',
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

    const resultOriginal = replaceMediasByLinks(content, medias)
    expect(resultOriginal).toContain('bloboriginal11223344.blob')

    const resultPreview = replaceMediasByLinks(content, medias, ['preview'])
    expect(resultPreview).toContain('blobpreview112233445.blob')
  })

  it('replaces multiple media tags in a single content string', () => {
    const medias = makeMedias([
      {
        oid: 'mediapic1234567890ab',
        relativePath: 'images/a.jpg',
        repositoryPath: '/repo',
        kind: 'picture',
        extension: 'jpg',
        blobs: [
          { oid: 'blobpica1122334455667', mimeType: 'image/jpeg', attributes: {}, tags: [] }
        ]
      },
      {
        oid: 'mediapic2234567890ab',
        relativePath: 'images/b.jpg',
        repositoryPath: '/repo',
        kind: 'picture',
        extension: 'jpg',
        blobs: [
          { oid: 'blobpicb1122334455667', mimeType: 'image/jpeg', attributes: {}, tags: [] }
        ]
      }
    ])
    const content =
      'First: <media relative-path="images/a.jpg" />\nSecond: <media relative-path="images/b.jpg" />'
    const result = replaceMediasByLinks(content, medias)
    expect(result).toContain('blobpica1122334455667.blob')
    expect(result).toContain('blobpicb1122334455667.blob')
  })
})

