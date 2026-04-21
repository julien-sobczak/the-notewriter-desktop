/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react'
import { Block, DeskWithContext, Note, Query } from '@renderer/Model'
import NoteContainer from './NoteContainer'
import RenderedNote from './RenderedNote'
import Loader from './Loader'

/* Implementation
 *
 * A minimal, static version of the desk renderer.
 * Each container block independently fetches its notes via window.api.search.
 * Non-container blocks (horizontal/vertical) simply render their children recursively.
 */

type RenderedDeskStaticProps = {
  desk: DeskWithContext
}

export default function RenderedDeskStatic({ desk }: RenderedDeskStaticProps) {
  return (
    <div className="Desk">
      <RenderedBlockStatic block={desk.root} repositorySlug={desk.repositorySlug} />
    </div>
  )
}

type RenderedBlockStaticProps = {
  block: Block
  repositorySlug: string
}

function RenderedBlockStatic({ block, repositorySlug }: RenderedBlockStaticProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (block.layout !== 'container') {
      setLoaded(true)
      return
    }

    if (!block.query) {
      setLoaded(true)
      return
    }

    const fetchNotes = async () => {
      const query: Query = {
        query: block.query!,
        repositories: [repositorySlug], // Desk are defined per repository
        deskOid: null,
        blockOid: null,
        limit: 0,
        shuffle: false
      }
      const result = await window.api.search(query)
      setNotes(result.notes)
      setLoaded(true)
    }

    fetchNotes()
  }, [block.query, block.layout])

  if (block.layout === 'container') {
    if (!loaded) return <Loader />

    if (notes.length === 0) {
      // Avoid appending a block to preserve space
      return
    }

    if (block.view === 'single') {
      const note = notes.length > 0 ? notes[0] : null
      return (
        <div className="BlockContainer">
          {note && (
            <RenderedNote
              note={note}
              showActions={block.showActions}
              showAttributes={block.showAttributes}
              showBody={block.showBody}
              showComment={block.showComment}
              showTags={block.showTags}
              showTitle={block.showTitle}
            />
          )}
        </div>
      )
    }

    return (
      <div className="BlockContainer">
        <NoteContainer
          name={block.name}
          notes={notes}
          layout={block.view ?? 'list'}
          layoutSelectable={false}
          showActions={block.showActions}
          showAttributes={block.showAttributes}
          showBody={block.showBody}
          showComment={block.showComment}
          showTags={block.showTags}
          showTitle={block.showTitle}
        />
      </div>
    )
  }

  return <BlockContainer block={block} repositorySlug={repositorySlug} layout={block.layout} />
}

type BlockContainerProps = {
  block: Block
  repositorySlug: string
  layout: string // 'horizontal' or 'vertical'
}

// This component is used for horizontal and vertical blocks.
function BlockContainer({ block, repositorySlug, layout }: BlockContainerProps) {
  const className = `Block${layout.charAt(0).toUpperCase() + layout.slice(1)}`
  return (
    <div className={className}>
      {block.elements?.map((element, index) => (
        <RenderedBlockStatic
          key={element.oid ?? index}
          block={element}
          repositorySlug={repositorySlug}
        />
      ))}
    </div>
  )
}
