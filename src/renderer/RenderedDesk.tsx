/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useRef, useEffect } from 'react';
import {
  ArrowsOutLineHorizontal,
  ArrowsOutLineVertical,
} from '@phosphor-icons/react';
import classNames from 'classnames';
import { Desk, Block, NoteRef } from 'shared/model/Config';
import { Note } from 'shared/model/Note';
import { Query, QueryResult } from '../shared/model/Query';
import NotesContainer from './NoteContainer';
import Loader from './Loader';
import { capitalize } from './helpers';

// Return all note refs present in a desk recursively.
function extractNoteRefs(desk: Desk): NoteRef[] {
  return extractNoteRefsFromBlock(desk, desk.root, desk.root.workspaces);
}

// Same as extractNoteRefs but from a given Block instead.
function extractNoteRefsFromBlock(
  desk: Desk,
  block: Block,
  workspaces: string[]
): NoteRef[] {
  // Determine on which workspace we are working
  let selectedWorkspaces = [];
  if (!block.workspaces || block.workspaces.length === 0) {
    selectedWorkspaces = block.workspaces;
  } else {
    selectedWorkspaces = workspaces;
  }

  const results: NoteRef[] = [];
  if (block.layout === 'container') {
    if (!block.noteRefs) return results;
    results.push(...block.noteRefs);
  } else if (block.layout === 'horizontal' || block.layout === 'vertical') {
    if (!block.elements) return results;
    for (const element of block.elements) {
      results.push(
        ...extractNoteRefsFromBlock(desk, element, selectedWorkspaces)
      );
    }
  }

  return results;
}

// Return all queries present in a desk recursively.
function extractQueries(desk: Desk): Query[] {
  return extractQueriesFromBlock(desk, desk.root, desk.root.workspaces);
}

// Same as extractQueries but from a given Block instead.
function extractQueriesFromBlock(
  desk: Desk,
  block: Block,
  workspaces: string[]
): Query[] {
  // Determine on which workspace we are working
  let selectedWorkspaces = [];
  if (!block.workspaces || block.workspaces.length === 0) {
    selectedWorkspaces = block.workspaces;
  } else {
    selectedWorkspaces = workspaces;
  }

  const results: Query[] = [];
  if (block.layout === 'container') {
    if (!block.query) return results;
    results.push({
      deskId: desk.id,
      blockId: block.id,
      q: block.query,
      workspaces: selectedWorkspaces,
    });
  } else if (block.layout === 'horizontal' || block.layout === 'vertical') {
    if (!block.elements) return results;
    for (const element of block.elements) {
      results.push(
        ...extractQueriesFromBlock(desk, element, selectedWorkspaces)
      );
    }
  }

  return results;
}

type RenderedDeskProps = {
  desk: Desk;
  selected: boolean;
};

export default function RenderedDesk({ desk, selected }: RenderedDeskProps) {
  const [queriesLoaded, setQueriesLoaded] = useState(false);
  const [noteRefsLoaded, setNoteRefsLoaded] = useState(false);
  const notesCache = useRef(new Map<String, Note[]>());

  useEffect(() => {
    if (queriesLoaded && noteRefsLoaded) return;

    const queries = extractQueries(desk);
    const noteRefs = extractNoteRefs(desk);

    fetch('http://localhost:3000/multi-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queries),
    })
      .then((response) => response.json())
      .then((results: QueryResult[]) => {
        setQueriesLoaded(true);
        for (const result of results) {
          if (!result.query.blockId) continue;
          notesCache.current.set(result.query.blockId, result.notes);
        }
        return null;
      })
      .catch((error: any) => console.log('Error:', error));

    fetch('http://localhost:3000/multi-find', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(noteRefs),
    })
      .then((response) => response.json())
      .then((results: Note[]) => {
        setNoteRefsLoaded(true);
        for (const result of results) {
          notesCache.current.set(result.oid, [result]);
        }
        return null;
      })
      .catch((error: any) => console.log('Error:', error));
  }, []);

  // TODO test drag & drop API between NoteContainer
  // TODO comment everything!!!!

  const loaded = queriesLoaded && noteRefsLoaded;

  return (
    <>
      {!loaded && <Loader />}
      {loaded && (
        <div className={classNames({ Desk: true, selected })}>
          <PaneContainer block={desk.root} notesCache={notesCache.current} />
        </div>
      )}
    </>
  );
}

type PaneContainerProps = {
  block: Block;
  notesCache: Map<String, Note[]>;
};

function PaneContainer({ block, notesCache }: PaneContainerProps) {
  if (block.layout === 'container') {
    // Search for notes in cache
    const notes: Note[] = [];
    if (block.query) {
      const foundNotes = notesCache.get(block.id);
      if (foundNotes && foundNotes.length > 0) {
        notes.push(...foundNotes);
      }
    }
    if (block.noteRefs) {
      for (const noteRef of block.noteRefs) {
        const foundNotes = notesCache.get(noteRef.id);
        if (foundNotes && foundNotes.length > 0) {
          notes.push(foundNotes[0]);
        }
      }
    }
    return <NotesContainer notes={notes} />;
  }

  return (
    <div className="PaneContainer">
      <div className="Actions">
        <nav>
          <ul>
            <li>
              <ArrowsOutLineHorizontal />
            </li>
            <li>
              <ArrowsOutLineVertical />
            </li>
          </ul>
        </nav>
      </div>
      <div className={`${capitalize(block.layout)}Pane`}>
        {block.elements?.map((element) => (
          <PaneContainer
            key={element.id}
            block={element}
            notesCache={notesCache}
          />
        ))}
      </div>
    </div>
  );
}
