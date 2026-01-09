import { Block, Desk } from '@renderer/Model'
import RenderedDesk from './RenderedDesk'
import { useState, useEffect, useContext } from 'react'
import { ConfigContext, selectedDesks } from '@renderer/ConfigContext'
import { generateOid, generateOidFromString } from '@renderer/helpers/oid'

// Static desks declared in config.jsonnet may omit OIDs.
// This function edits a desk to ensure all blocks have OIDs populated.
// NB: Dynamic desks created by users in the app should already have these properties set.
async function editDesk(desk: Desk): Promise<Desk> {
  const editBlock = (currentBlock: Block): Block => {
    const editedElements: Block[] = []
    for (const child of currentBlock.elements ?? []) {
      editedElements.push(editBlock(child))
    }
    return {
      ...currentBlock,
      oid: currentBlock.oid ? currentBlock.oid : generateOid(),
      layout: currentBlock.layout ? currentBlock.layout : 'container',
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
    root: editBlock(desk.root)
  }
}

type RenderedDeskTabProps = {
  title: string
  oid: string
}

function RenderedDeskTab({ oid }: RenderedDeskTabProps) {
  const [desk, setDesk] = useState<Desk | null>(null)

  const { config } = useContext(ConfigContext)
  const dynamicDecks = config.config.desks

  useEffect(() => {
    const findDesk = async () => {
      // First check dynamic desks
      let foundDesk = dynamicDecks?.find((d) => d.oid === oid)

      // If not found in dynamic desks, search in repository configs
      if (!foundDesk) {
        const repoDesks = selectedDesks(config)
        for (const desk of repoDesks) {
          if (desk.oid !== oid || foundDesk) continue
          const deskOid = await generateOidFromString(desk.name)
          if (deskOid === oid && !desk.template) {
            foundDesk = desk
            break
          }
        }
      }

      if (!foundDesk) return

      editDesk(foundDesk).then((editedDesk) => setDesk(editedDesk))
    }

    findDesk()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!desk) {
    return <div>Loading desk...</div>
  }

  return <RenderedDesk desk={desk} />
}

export default RenderedDeskTab
