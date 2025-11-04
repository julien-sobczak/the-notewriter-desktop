/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect, useContext } from 'react'
import {
  ArrowsOutLineHorizontalIcon as HorizontalIcon,
  ArrowsOutLineVerticalIcon as VerticalIcon,
  XIcon as CloseIcon
} from '@phosphor-icons/react'
import classNames from 'classnames'
import { Desk, Block, Note, Query, QueryResult } from '@renderer/Model'
import NoteContainer from './NoteContainer'
import Loader from './Loader'
import { Action, Actions } from './Actions'
import { capitalize } from '@renderer/helpers/strings'
import { generateOid } from '@renderer/helpers/oid'
import { ConfigContext, getSelectedRepositorySlugs } from '@renderer/ConfigContext'
import {
  deleteBlock,
  extractNoteRefs,
  extractQueries,
  findBlock,
  splitBlock
} from '@renderer/helpers/desk'

/* Implementation
 *
 * A desk contains a hierarchy of different blocks.
 * A block can be either:
 * - a container: contains notes (via noteRefs) or a query to fetch notes
 * - a horizontal pane: contains other blocks arranged horizontally
 * - a vertical pane: contains other blocks arranged vertically
 *
 * To render a desk, we need to recursively traverse the block hierarchy
 * and render each block accordingly. To avoid multiple fetches, we first
 * extract all note references and queries from the desk, perform a batch fetch,
 * and then render the desk once all notes are loaded.
 */

type RenderedDeskProps = {
  desk: Desk
}

export default function RenderedDesk({ desk: initialDesk }: RenderedDeskProps) {
  const { config } = useContext(ConfigContext)
  const staticConfig = config.static

  const [desk, setDesk] = useState(initialDesk)
  const [queriesLoaded, setQueriesLoaded] = useState(false)
  const [noteRefsLoaded, setNoteRefsLoaded] = useState(false)
  const notesCache = useRef(new Map<string, Note[]>())

  // Helper to update desk and force reload notes
  const updateDesk = (newDesk: Desk) => {
    console.log('Updating desk', newDesk) // FIXME remove
    setDesk(newDesk)
    setQueriesLoaded(false)
    setNoteRefsLoaded(false)
    notesCache.current = new Map<string, Note[]>()
  }

  useEffect(() => {
    // Start by loading all notes
    if (queriesLoaded && noteRefsLoaded) return

    const queries = extractQueries(desk)
    const noteRefs = extractNoteRefs(desk)

    const msearch = async () => {
      const results: QueryResult[] = await window.api.msearch(queries)
      setQueriesLoaded(true)
      for (const result of results) {
        if (!result.query.blockOid) continue
        notesCache.current.set(result.query.blockOid, result.notes)
      }
    }

    const mfind = async () => {
      const results: Note[] = await window.api.mfind(noteRefs)
      setNoteRefsLoaded(true)
      for (const result of results) {
        notesCache.current.set(result.oid, [result])
      }
    }

    msearch()
    mfind()
  }, [desk])

  const loaded = queriesLoaded && noteRefsLoaded

  // Handler to delete a block by oid
  const handleDeleteBlock = (oid: string) => {
    const newRoot = deleteBlock(desk.root, oid)
    if (newRoot) {
      updateDesk({ ...desk, root: newRoot })
    } else {
      updateDesk({
        ...desk,
        root: {
          oid: generateOid(),
          layout: 'container',
          name: '',
          query: '',
          noteRefs: [],
          view: 'list',
          repositorySlugs: getSelectedRepositorySlugs(staticConfig),
          elements: [],
          size: null
        }
      })
    }
  }

  // Handler to split a block
  const handleSplitBlock = (oid: string, direction: 'horizontal' | 'vertical') => {
    updateDesk({ ...desk, root: splitBlock(desk.root, oid, direction) })
  }

  // Handler to submit a query for a container block
  const handleSubmitQuery = async (blockOid: string, query: string) => {
    const block = findBlock(desk.root, blockOid)
    if (!block) return
    block.query = query
    updateDesk({ ...desk })
    // Fetch notes for this query
    const q: Query = {
      deskOid: desk.oid,
      blockOid: blockOid,
      q: query,
      repositories: block.repositorySlugs ?? [],
      limit: 0,
      shuffle: false
    }
    const results: QueryResult[] = await window.api.msearch([q])
    for (const result of results) {
      if (!result.query.blockOid) continue
      notesCache.current.set(result.query.blockOid, result.notes)
    }
    setQueriesLoaded(true)
  }

  return (
    <>
      {!loaded && <Loader />}
      {loaded && (
        <div className={classNames({ Desk: true })}>
          <BlockContainer
            block={desk.root}
            notesCache={notesCache.current}
            onDeleteBlock={handleDeleteBlock}
            onSplitBlock={handleSplitBlock}
            onSubmitQuery={handleSubmitQuery}
          />
        </div>
      )}
    </>
  )
}

type BlockContainerProps = {
  block: Block
  notesCache: Map<string, Note[]>
  onDeleteBlock: (oid: string) => void
  onSplitBlock: (oid: string, direction: 'horizontal' | 'vertical') => void
  onSubmitQuery: (blockOid: string, query: string) => void
}

function BlockContainer({
  block,
  notesCache,
  onDeleteBlock,
  onSplitBlock,
  onSubmitQuery
}: BlockContainerProps) {
  const [queryInput, setQueryInput] = useState('')

  if (block.layout === 'container') {
    const notes: Note[] = []
    if (block.query) {
      const foundNotes = notesCache.get(block.oid ?? '')
      if (foundNotes && foundNotes.length > 0) {
        notes.push(...foundNotes)
      }
    }
    if (block.noteRefs) {
      for (const noteRef of block.noteRefs) {
        const foundNotes = notesCache.get(noteRef.oid)
        if (foundNotes && foundNotes.length > 0) {
          notes.push(foundNotes[0])
        }
      }
    }
    // Show input if no query and no noteRefs
    if (!block.query && (!block.noteRefs || block.noteRefs.length === 0)) {
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (queryInput.trim()) {
              onSubmitQuery(block.oid ?? '', queryInput)
            }
          }}
        >
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Enter query"
          />
          <button type="submit">Search</button>
        </form>
      )
    }
    return (
      <NoteContainer
        name={block.name}
        notes={notes}
        onClose={() => onDeleteBlock(block.oid ?? '')}
      />
    )
  }

  return (
    <div className="BlockContainer">
      <Actions className="BlockContainerActions">
        <Action
          icon={<HorizontalIcon />}
          title="Horizontal split"
          onClick={() => onSplitBlock(block.oid ?? '', 'horizontal')}
        />
        <Action
          icon={<VerticalIcon />}
          title="Vertical split"
          onClick={() => onSplitBlock(block.oid ?? '', 'vertical')}
        />
        <Action icon={<CloseIcon />} title="Close" onClick={() => onDeleteBlock(block.oid ?? '')} />
      </Actions>
      <div className={`Block${capitalize(block.layout ?? 'container')}`}>
        {block.elements?.map((element) => (
          <BlockContainer
            key={element.oid}
            block={element}
            notesCache={notesCache}
            onDeleteBlock={onDeleteBlock}
            onSplitBlock={onSplitBlock}
            onSubmitQuery={onSubmitQuery}
          />
        ))}
      </div>
    </div>
  )
}
