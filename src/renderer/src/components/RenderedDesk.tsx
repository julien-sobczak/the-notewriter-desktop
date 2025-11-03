/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from 'react'
import { ArrowsOutLineHorizontalIcon, ArrowsOutLineVerticalIcon } from '@phosphor-icons/react'
import classNames from 'classnames'
import { Desk, Block, Note, NoteRef, Query, QueryResult } from '@renderer/Model'
import NoteContainer from './NoteContainer'
import Loader from './Loader'
import { Action, Actions } from './Actions'
import { capitalize } from '@renderer/helpers/strings'

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

// Return all note refs present in a desk recursively.
function extractNoteRefs(desk: Desk): NoteRef[] {
  return extractNoteRefsFromBlock(desk, desk.root, desk.root.repositorySlugs)
}

// Same as extractNoteRefs but from a given Block instead.
function extractNoteRefsFromBlock(desk: Desk, block: Block, repositories: string[]): NoteRef[] {
  // Determine on which repository we are working
  let selectedRepositories: string[] = []
  if (!block.repositorySlugs || block.repositorySlugs.length === 0) {
    selectedRepositories = block.repositorySlugs
  } else {
    selectedRepositories = repositories
  }

  const results: NoteRef[] = []
  if (block.layout === 'container') {
    if (!block.noteRefs) return results
    results.push(...block.noteRefs)
  } else if (block.layout === 'horizontal' || block.layout === 'vertical') {
    if (!block.elements) return results
    for (const element of block.elements) {
      results.push(...extractNoteRefsFromBlock(desk, element, selectedRepositories))
    }
  }

  return results
}

// Return all queries present in a desk recursively.
function extractQueries(desk: Desk): Query[] {
  return extractQueriesFromBlock(desk, desk.root)
}

// Same as extractQueries but from a given Block instead.
function extractQueriesFromBlock(desk: Desk, block: Block): Query[] {
  const results: Query[] = []
  if (block.layout === 'container') {
    if (!block.query) return results
    results.push({
      deskOid: desk.oid,
      blockOid: block.oid,
      q: block.query,
      repositories: block.repositorySlugs ?? [],
      limit: 0,
      shuffle: false
    })
  } else if (block.layout === 'horizontal' || block.layout === 'vertical') {
    if (!block.elements) return results
    for (const element of block.elements) {
      results.push(...extractQueriesFromBlock(desk, element))
    }
  }

  return results
}

// TODO handle split/close buttons
// TODO now save icon when a desk is updated
// TODO now move note between container (add unlock icon)
// TODO test drag & drop API between NoteContainer

type RenderedDeskProps = {
  desk: Desk
}

export default function RenderedDesk({ desk }: RenderedDeskProps) {
  const [queriesLoaded, setQueriesLoaded] = useState(false)
  const [noteRefsLoaded, setNoteRefsLoaded] = useState(false)
  // Cache loaded notes here to avoid re-fetching
  const notesCache = useRef(new Map<string, Note[]>())

  useEffect(() => {
    // Start by loading all notes
    if (queriesLoaded && noteRefsLoaded) return

    console.log(`desk`, desk) // FIXME remove
    const queries = extractQueries(desk)
    const noteRefs = extractNoteRefs(desk)

    console.log(`RenderedDesk: loading ${queries.length} queries and ${noteRefs.length} noteRefs`) // FIXME remove

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
  }, [])

  const loaded = queriesLoaded && noteRefsLoaded

  return (
    <>
      {!loaded && <Loader />}
      {loaded && (
        <div className={classNames({ Desk: true })}>
          <BlockContainer block={desk.root} notesCache={notesCache.current} />
        </div>
      )}
    </>
  )
}

type BlockContainerProps = {
  block: Block
  notesCache: Map<string, Note[]>
}

function BlockContainer({ block, notesCache }: BlockContainerProps) {
  if (block.layout === 'container') {
    // Search for notes in cache
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
    return <NoteContainer name={block.name} notes={notes} />
  }

  return (
    <div className="BlockContainer">
      <Actions>
        <Action icon={<ArrowsOutLineHorizontalIcon />} title="Horizontal split" />
        <Action icon={<ArrowsOutLineVerticalIcon />} title="Vertical split" />
      </Actions>
      <div className={`Block${capitalize(block.layout ?? 'container')}`}>
        {block.elements?.map((element) => (
          <BlockContainer key={element.oid} block={element} notesCache={notesCache} />
        ))}
      </div>
    </div>
  )
}
