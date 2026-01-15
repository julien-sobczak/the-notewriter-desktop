import { Block, Desk, NoteRef, Query } from '@renderer/Model'
import { generateOid } from './oid'

// Return all note refs present in a desk recursively.
export function extractNoteRefs(desk: Desk): NoteRef[] {
  return extractNoteRefsFromBlock(desk, desk.root)
}

// Same as extractNoteRefs but from a given Block instead.
function extractNoteRefsFromBlock(desk: Desk, block: Block): NoteRef[] {
  const results: NoteRef[] = []
  if (block.layout === 'container') {
    if (!block.noteRefs) return results
    results.push(...block.noteRefs)
  } else if (block.layout === 'horizontal' || block.layout === 'vertical') {
    if (!block.elements) return results
    for (const element of block.elements) {
      results.push(...extractNoteRefsFromBlock(desk, element))
    }
  }

  return results
}

// Return all queries present in a desk recursively.
export function extractQueries(desk: Desk): Query[] {
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
      query: block.query,
      repositories: block.repositories,
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

// Find a block by oid
export function findBlock(block: Block, oid: string): Block | null {
  if (block.oid === oid) return block
  if (block.elements) {
    for (const el of block.elements) {
      const found = findBlock(el, oid)
      if (found) return found
    }
  }
  return null
}

// Delete a block by oid
export function deleteBlock(block: Block, targetOid: string): Block | null {
  if (block.oid === targetOid) return null
  if (block.elements && block.elements.length > 0) {
    const newElements: Block[] = block.elements
      .map((el: Block) => deleteBlock(el, targetOid))
      .filter((el: Block | null) => el !== null)
    if (newElements.length === 0) {
      return null
    }
    return { ...block, elements: newElements }
  }
  return block
}

// Top-level helper to split a block
export function splitBlock(block: Block, oid: string, direction: 'horizontal' | 'vertical'): Block {
  if (block.oid !== oid) {
    if (block.elements) {
      return {
        ...block,
        elements: block.elements.map((el) => splitBlock(el, oid, direction))
      }
    }
    return block
  }
  if (block.layout === direction) {
    const newSize = `${Math.floor(100 / (block.elements?.length ?? 0 + 1))}%`
    return {
      ...block,
      elements: [
        ...(block.elements?.map((el) => ({
          ...el,
          size: newSize
        })) ?? []),
        {
          oid: generateOid(),
          layout: 'container',
          name: '',
          query: '',
          repositories: block.repositories,
          noteRefs: [],
          size: newSize,
          view: 'list',
          elements: []
        }
      ]
    }
  } else {
    return {
      oid: generateOid(),
      name: '',
      noteRefs: [],
      repositories: block.repositories,
      query: '',
      size: '50%',
      view: 'list',
      layout: direction,
      elements: [
        {
          ...block,
          size: '50%'
        },
        {
          oid: generateOid(),
          layout: 'container',
          name: '',
          noteRefs: [],
          repositories: block.repositories,
          query: '',
          size: '50%',
          view: 'list',
          elements: []
        }
      ]
    }
  }
}
