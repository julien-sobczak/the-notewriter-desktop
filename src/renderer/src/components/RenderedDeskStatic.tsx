/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext } from 'react'
import { Block, DeskWithContext, Note, Query } from '@renderer/Model'
import { ConfigContext, getSelectedRepositorySlugs } from '@renderer/ConfigContext'
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
  const { config } = useContext(ConfigContext)
  const editorConfig = config.config

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
        repositories: getSelectedRepositorySlugs(editorConfig),
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

    if (block.view === 'single') {
      const note = notes.length > 0 ? notes[0] : null
      return <div className="BlockContainer">{note && <RenderedNote note={note} />}</div>
    }

    return (
      <div className="BlockContainer">
        <NoteContainer
          name={block.name}
          notes={notes}
          layout={block.view ?? 'list'}
          layoutSelectable={false}
        />
      </div>
    )
  }

  if (block.layout === 'horizontal') {
    return (
      <div className="BlockHorizontal">
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

  if (block.layout === 'vertical') {
    return (
      <div className="BlockVertical">
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

  return null
}
