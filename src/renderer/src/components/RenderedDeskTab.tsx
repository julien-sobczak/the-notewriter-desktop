import { Block, Desk } from '@renderer/Model'
import RenderedDesk from './RenderedDesk'
import { useState, useEffect, useContext } from 'react'
import { ConfigContext } from '@renderer/ConfigContext'
import { generateOid, generateOidFromString } from '@renderer/helpers/oid'

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
    // Search for a desk with OID in dynamic, then static config.
    // Ignore templates and generate the OIDs from the names for static desks.
    const foundDesk =
      dynamicDecks?.find((d) => d.oid === oid) ||
      staticDecks?.find(async (d) => (await generateOidFromString(d.name)) === oid && !d.template)

    if (!foundDesk) return

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
    const editDesk = async (currentDesk: Desk): Promise<Desk> => {
      let deskOid = currentDesk.oid
      if (!deskOid) {
        deskOid = await generateOidFromString(currentDesk.name)
      }
      return {
        ...currentDesk,
        oid: deskOid,
        root: await editBlock(currentDesk.root, [])
      }
    }

    editDesk(foundDesk).then((editedDesk) => setDesk(editedDesk))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!desk) {
    return <div>Loading desk...</div>
  }

  return <RenderedDesk desk={desk} />
}

export default RenderedDeskTab
