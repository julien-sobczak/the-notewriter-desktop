import { Media, Blob } from '@renderer/Model'

export interface WithMedias {
  medias: Media[]
  repositoryPath: string
}

export function formatContent(
  holder: WithMedias,
  content: string,
  tags: string[] = [],
  missingMediaSrc = ''
): string {
  // Regex to locate media references
  const reMedias: RegExp = /<media relative-path="(.*)".*\/>/g
  let m: RegExpExecArray | null

  // Create a map of all medias for quick access
  const mediasByRelativePath = new Map<string, Media>()
  holder.medias.forEach((media) => mediasByRelativePath.set(media.relativePath, media))

  let result = content

  // Extract <Media /> tags
  const mediaTags: string[] = []
  while (true) {
    m = reMedias.exec(result)
    if (m == null) {
      break
    }
    mediaTags.push(m[0])
  }

  // Parse tags and replace by standard HTML tags
  for (const mediaTag of mediaTags) {
    let relativePath: string = ''
    let alt: string = ''
    let title: string = ''
    const indexRelativePath = mediaTag.indexOf('relative-path="')
    const indexAlt = mediaTag.indexOf('alt="')
    const indexTitle = mediaTag.indexOf('title="')
    if (indexRelativePath !== -1) {
      const indexStart = indexRelativePath + 'relative-path="'.length
      const indexEnd = mediaTag.indexOf('"', indexStart)
      relativePath = mediaTag.substring(indexStart, indexEnd)
    }
    if (indexAlt !== -1) {
      const indexStart = indexAlt + 'alt="'.length
      const indexEnd = mediaTag.indexOf('"', indexStart)
      alt = mediaTag.substring(indexStart, indexEnd)
    }
    if (indexTitle !== -1) {
      const indexStart = indexTitle + 'title="'.length
      const indexEnd = mediaTag.indexOf('"', indexStart)
      title = mediaTag.substring(indexStart, indexEnd)
    }

    if (relativePath === '' || !mediasByRelativePath.has(relativePath)) {
      // 404 or dangling media or missing blob
      console.warn(`Missing media ${relativePath}`, mediasByRelativePath)
      result = result.replace(mediaTag, `<img src="${missingMediaSrc}" class="missing" />`)
      continue
    }

    const media = mediasByRelativePath.get(relativePath)
    if (!media) {
      // already managed in above condition
      continue
    }
    // Try to find a blob matching every tags
    let foundBlob: Blob | null = null
    for (const blob of media.blobs) {
      if (media.kind === 'video' && blob.mimeType.startsWith('image/')) {
        // Ignore for now the blob containing the first frame of videos
        continue
      }
      if (tags.every((tag) => blob.tags.includes(tag))) {
        // Found a potential blob
        foundBlob = blob
        break
      }
    }
    if (!foundBlob) {
      console.warn(`Missing blob for media ${relativePath} matching "${tags.join(',')}"`)

      // Fallback to the first blob
      if (media.blobs.length === 0) {
        result = result.replace(mediaTag, `<img src="${missingMediaSrc}" class="missing" />`)
        continue
      }
      foundBlob = media.blobs[0]
      if (media.kind === 'video' && foundBlob.mimeType.startsWith('image/')) {
        // Ignore for now the blob containing the first frame of videos
        foundBlob = media.blobs[1]
      }
    }

    const blob = foundBlob
    const prefix = blob.oid.substring(0, 2)
    const blobPath = `${holder.repositoryPath}/.nt/objects/${prefix}/${blob.oid}.blob`

    console.debug(`Found blob ${foundBlob.oid} for media ${relativePath} at path ${blobPath}`)

    if (media.kind === 'picture') {
      result = result.replace(
        mediaTag,
        `<img src="https://notewriter.app/${blobPath}" alt="${alt}" title="${title}" />`
      )
      continue
    }
    if (media.kind === 'audio') {
      result = result.replace(
        mediaTag,
        `<audio controls title="${title}"><source src="https://notewriter.app/${blobPath}" type="${blob.mimeType}"></audio>`
      )
      continue
    }
    if (media.kind === 'video') {
      result = result.replace(
        mediaTag,
        `<video controls title="${title}"><source src="https://notewriter.app/${blobPath}" type="${blob.mimeType}"></video>`
      )
      continue
    }

    // Use a standard <a> otherwise to redirect to the raw file otherwise
    let label = 'link'
    if (title !== '') {
      label = 'Document'
    }
    result = result.replace(
      mediaTag,
      `<a target="_blank" href="https://notewriter.app/${blobPath}" title="${title}">${label}</a>`
    )
  }

  return result
}
