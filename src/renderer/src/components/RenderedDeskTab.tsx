import { Block, Desk } from '@renderer/Model'
import RenderedDesk from './RenderedDesk'
import { useState, useEffect, useContext } from 'react'
import { ConfigContext } from '@renderer/ConfigContext'
import { generateOid, generateOidFromString } from '@renderer/helpers/oid'

// Static desks declared in editorconfig.jsonnet relies a lot on implicit properties.
// This function edits a desk to ensure all blocks have OIDs and repositorySlugs populated.
// NB: Dynamic desks created by users in the app should already have these properties set.
async function editDesk(desk: Desk): Promise<Desk> {
  const editBlock = (currentBlock: Block, parentRepositories: string[]): Block => {
    const editedRepositories = currentBlock.repositorySlugs ?? parentRepositories
    const editedElements: Block[] = []
    for (const child of currentBlock.elements ?? []) {
      editedElements.push(editBlock(child, editedRepositories))
    }
    return {
      ...currentBlock,
      oid: currentBlock.oid ? currentBlock.oid : generateOid(),
      layout: currentBlock.layout ? currentBlock.layout : 'container',
      repositorySlugs: editedRepositories,
      elements: editedElements
    }
  }

  // Edit desk to populate OID if missing (static decks omit them for convenience)
  let deskOid = desk.oid
  if (!deskOid) {
    deskOid = await generateOidFromString(desk.name)
  }
  return {
    ...desk,
    oid: deskOid,
    root: editBlock(desk.root, [])
  }
}

type RenderedDeskTabProps = {
  title: string
  oid: string
}

function RenderedDeskTab({ oid }: RenderedDeskTabProps) {
  const [desk, setDesk] = useState<Desk | null>(null)

  const { config } = useContext(ConfigContext)
  const staticDecks = config.static.desks
  const dynamicDecks = config.dynamic.desks

  useEffect(() => {
    const foundDesk =
      // Search for a desk with OID in dynamic, then static config.
      dynamicDecks?.find((d) => d.oid === oid) ||
      // Ignore templates and generate the OIDs from the names for static desks.
      staticDecks?.find(async (d) => (await generateOidFromString(d.name)) === oid && !d.template)

    if (!foundDesk) return

    editDesk(foundDesk).then((editedDesk) => setDesk(editedDesk))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!desk) {
    return <div>Loading desk...</div>
  }

  return <RenderedDesk desk={desk} />
}

export default RenderedDeskTab
