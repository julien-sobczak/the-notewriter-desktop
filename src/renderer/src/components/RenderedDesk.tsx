/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from 'react'
import { ArrowsOutLineHorizontalIcon, ArrowsOutLineVerticalIcon } from '@phosphor-icons/react'
import classNames from 'classnames'
import { Desk, Block, Note, NoteRef, Query, QueryResult } from '@renderer/Model'
import NoteContainer from './NoteContainer'
import Loader from './Loader'
import { Action, Actions } from './Actions'
import { capitalize } from '@renderer/helpers/strings'

// Return all note refs present in a desk recursively.
function extractNoteRefs(desk: Desk): NoteRef[] {
  return extractNoteRefsFromBlock(desk, desk.root, desk.root.repositories)
}

// Same as extractNoteRefs but from a given Block instead.
function extractNoteRefsFromBlock(desk: Desk, block: Block, repositories: string[]): NoteRef[] {
  // Determine on which repository we are working
  let selectedRepositories: string[] = []
  if (!block.repositories || block.repositories.length === 0) {
    selectedRepositories = block.repositories
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
  return extractQueriesFromBlock(desk, desk.root, desk.root.repositories)
}

// Same as extractQueries but from a given Block instead.
function extractQueriesFromBlock(desk: Desk, block: Block, repositories: string[]): Query[] {
  // Determine on which repository we are working
  let selectedRepositories: string[] = []
  if (!block.repositories || block.repositories.length === 0) {
    selectedRepositories = block.repositories
  } else {
    selectedRepositories = repositories
  }

  const results: Query[] = []
  if (block.layout === 'container') {
    if (!block.query) return results
    results.push({
      deskId: desk.id,
      blockId: block.id,
      q: block.query,
      repositories: selectedRepositories,
      limit: 0,
      shuffle: false
    })
  } else if (block.layout === 'horizontal' || block.layout === 'vertical') {
    if (!block.elements) return results
    for (const element of block.elements) {
      results.push(...extractQueriesFromBlock(desk, element, selectedRepositories))
    }
  }

  return results
}

// TODO handle split/close buttons
// TODO now save icon when a desk is updated
// TODO now move note between container (add unlock icon)

type RenderedDeskProps = {
  desk: Desk
  selected: boolean
}

export default function RenderedDesk({ desk, selected }: RenderedDeskProps) {
  const [queriesLoaded, setQueriesLoaded] = useState(false)
  const [noteRefsLoaded, setNoteRefsLoaded] = useState(false)
  const notesCache = useRef(new Map<string, Note[]>())

  useEffect(() => {
    if (queriesLoaded && noteRefsLoaded) return

    const queries = extractQueries(desk)
    const noteRefs = extractNoteRefs(desk)

    const msearch = async () => {
      const results: QueryResult[] = await window.api.msearch(queries)
      setQueriesLoaded(true)
      for (const result of results) {
        if (!result.query.blockId) continue
        notesCache.current.set(result.query.blockId, result.notes)
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

  // TODO test drag & drop API between NoteContainer
  // TODO comment everything!!!!

  const loaded = queriesLoaded && noteRefsLoaded

  return (
    <>
      {!loaded && <Loader />}
      {loaded && (
        <div className={classNames({ Desk: true, selected })}>
          <PaneContainer block={desk.root} notesCache={notesCache.current} />
        </div>
      )}
    </>
  )
}

type PaneContainerProps = {
  block: Block
  notesCache: Map<string, Note[]>
}

function PaneContainer({ block, notesCache }: PaneContainerProps) {
  if (block.layout === 'container') {
    // Search for notes in cache
    const notes: Note[] = []
    if (block.query) {
      const foundNotes = notesCache.get(block.id)
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
    <div className="PaneContainer">
      <Actions>
        <Action icon={<ArrowsOutLineHorizontalIcon />} title="Horizontal split" />
        <Action icon={<ArrowsOutLineVerticalIcon />} title="Vertical split" />
      </Actions>
      <div className={`${capitalize(block.layout)}Pane`}>
        {block.elements?.map((element) => (
          <PaneContainer key={element.id} block={element} notesCache={notesCache} />
        ))}
      </div>
    </div>
  )
}
