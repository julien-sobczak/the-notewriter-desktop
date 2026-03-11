import { findBlock, deleteBlock, splitBlock, evaluateDeskTemplate, initializeDesk } from './desk'
import { Block, Desk, DeskWithContext } from '@renderer/Model'
import { generateOid } from './oid'

describe('findBlock', () => {
  it('finds a block by oid', () => {
    const block: Block = {
      ...emptyVerticalBlock,
      oid: '5aebb12fde61404c815b38f5c86f7f16a5eca074',
      elements: [
        {
          ...emptyContainerBlock,
          oid: '59e7178d0f714522ae6599823b0864efb3fd9ee0'
        },
        {
          ...emptyContainerBlock,
          oid: '3f91b7e91e8d45cc9d6baa8fff6ea9c366ca075a'
        }
      ]
    }
    expect(findBlock(block, '59e7178d0f714522ae6599823b0864efb3fd9ee0')?.oid).toBe(
      '59e7178d0f714522ae6599823b0864efb3fd9ee0'
    )
    expect(findBlock(block, 'notfound')).toBeNull()
  })
})

describe('deleteBlock', () => {
  it('deletes a block by oid', () => {
    const block: Block = {
      ...emptyVerticalBlock,
      oid: 'b8bafe7c708446ee8122da7a216f968441aefaa7',
      elements: [
        {
          ...emptyContainerBlock,
          oid: '60b39c7b129f4fcc89fb3bf7ff75f6c875b1bc5b'
        },
        {
          ...emptyContainerBlock,
          oid: '4fb9ec26ce924ea1b96cb1ffdf755c9cdee96da4'
        }
      ]
    }
    const result = deleteBlock(block, '60b39c7b129f4fcc89fb3bf7ff75f6c875b1bc5b')
    expect(result?.elements?.length).toBe(1)
    expect(result?.elements?.[0].oid).toBe('4fb9ec26ce924ea1b96cb1ffdf755c9cdee96da4')
  })
})

describe('splitBlock', () => {
  it('splits a block horizontally', () => {
    const block: Block = {
      ...emptyHorizontalBlock,
      oid: 'c04675893d35444688fc599dba486fd2f69a837f',
      elements: [
        {
          ...emptyContainerBlock,
          oid: 'a1e5f4b2d3c44f2fa9e8b7c6e5d4c3b2a1f0e9d8'
        }
      ]
    }
    const result = splitBlock(block, 'c04675893d35444688fc599dba486fd2f69a837f', 'horizontal')
    expect(result.elements?.length).toBe(2)
    // A new container block should be added
    expect(result.elements?.[1].layout).toBe('container')
  })

  it('wraps a block in a vertical split', () => {
    const block: Block = {
      ...emptyHorizontalBlock,
      oid: '38489a5e28e14bd39a178b2c6590ba3a4e1b5b88',
      elements: [
        {
          ...emptyContainerBlock,
          oid: '902d976e3ac74566b32b9d3e6e704feee6716b4f'
        }
      ]
    }
    const result = splitBlock(block, '38489a5e28e14bd39a178b2c6590ba3a4e1b5b88', 'vertical')
    // The top-level block should now be vertical
    expect(result.layout).toBe('vertical')
    // A new container block should be added
    expect(result.elements?.length).toBe(2)
    expect(result.elements?.[0].layout).toBe('horizontal')
    expect(result.elements?.[0].oid).toBe('38489a5e28e14bd39a178b2c6590ba3a4e1b5b88')
    expect(result.elements?.[1].layout).toBe('container')
  })
})

describe('initializeDesk', () => {
  it('generates an OID for a desk without one', () => {
    const desk: DeskWithContext = {
      name: 'Test Desk',
      repositorySlug: 'test-repo',
      description: null,
      root: {
        name: null,
        layout: 'container',
        view: null,
        size: null,
        query: null,
        noteRefs: [],
        elements: null
      }
    }
    const result = initializeDesk(desk)
    expect(result.oid).toBeDefined()
    expect(result.oid).not.toBe('')
  })

  it('preserves existing desk OID', () => {
    const existingOid = 'existing-desk-oid-123'
    const desk: DeskWithContext = {
      oid: existingOid,
      name: 'Test Desk',
      repositorySlug: 'test-repo',
      description: null,
      root: {
        name: null,
        layout: 'container',
        view: null,
        size: null,
        query: null,
        noteRefs: [],
        elements: null
      }
    }
    const result = initializeDesk(desk)
    expect(result.oid).toBe(existingOid)
  })

  it('generates OIDs for all blocks without one', () => {
    const desk: DeskWithContext = {
      name: 'Test Desk',
      repositorySlug: 'test-repo',
      description: null,
      root: {
        name: 'root',
        layout: 'horizontal',
        view: null,
        size: null,
        query: null,
        noteRefs: [],
        elements: [
          {
            name: 'block1',
            layout: 'container',
            view: null,
            size: null,
            query: null,
            noteRefs: [],
            elements: null
          },
          {
            name: 'block2',
            layout: 'container',
            view: null,
            size: null,
            query: null,
            noteRefs: [],
            elements: null
          }
        ]
      }
    }
    const result = initializeDesk(desk)
    expect(result.root.oid).toBeDefined()
    expect(result.root.elements?.[0].oid).toBeDefined()
    expect(result.root.elements?.[1].oid).toBeDefined()
    expect(result.root.elements?.[0].oid).not.toBe(result.root.elements?.[1].oid)
  })
})

describe('evaluateDeskTemplate', () => {
  it('prepends path to query in container block', () => {
    const desk: Desk = {
      name: 'Test Desk',
      description: null,
      root: {
        name: 'root',
        layout: 'container',
        view: null,
        size: null,
        query: 'type:note',
        noteRefs: [],
        elements: null
      }
    }
    const result = evaluateDeskTemplate(desk, 'docs/notes')
    expect(result.root.query).toBe('path:docs/notes type:note')
    expect(result.template).toBe(false)
  })

  it('does not modify container blocks without queries', () => {
    const desk: Desk = {
      name: 'Test Desk',
      description: null,
      root: {
        name: 'root',
        layout: 'container',
        view: null,
        size: null,
        query: null,
        noteRefs: [],
        elements: null
      }
    }
    const result = evaluateDeskTemplate(desk, 'docs/notes')
    expect(result.root.query).toBeNull()
  })

  it('handles deeply nested blocks with queries', () => {
    const desk: Desk = {
      name: 'Test Desk',
      description: null,
      root: {
        name: 'root',
        layout: 'vertical',
        view: null,
        size: null,
        query: null,
        noteRefs: [],
        elements: [
          {
            name: 'parent',
            layout: 'horizontal',
            view: null,
            size: null,
            query: null,
            noteRefs: [],
            elements: [
              {
                name: 'child',
                layout: 'container',
                view: null,
                size: null,
                query: 'type:reference',
                noteRefs: [],
                elements: null
              }
            ]
          }
        ]
      }
    }
    const result = evaluateDeskTemplate(desk, 'docs/notes')
    expect(result.root.elements?.[0].elements?.[0].query).toBe('path:docs/notes type:reference')
  })
})

/* Fixtures */

const emptyContainerBlock: Block = {
  oid: generateOid(),
  layout: 'container',
  name: '',
  noteRefs: [],
  query: '',
  elements: [],
  view: 'list',
  size: null
}
const emptyVerticalBlock: Block = {
  ...emptyContainerBlock,
  layout: 'vertical'
}
const emptyHorizontalBlock: Block = {
  ...emptyContainerBlock,
  layout: 'horizontal'
}
