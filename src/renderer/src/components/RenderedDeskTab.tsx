import { DeskTab, Desk } from '@renderer/Model'
import RenderedDesk from './RenderedDesk'
import { useState, useEffect } from 'react'

type RenderedDeskTabProps = {
  tab: DeskTab
}

function RenderedDeskTab({ tab }: RenderedDeskTabProps) {
  const [desk, setDesk] = useState<Desk | null>(null)

  useEffect(() => {
    // Load or create a desk based on the oid
    // For now, create a blank desk structure
    const newDesk: Desk = {
      id: tab.oid,
      name: 'New Desk',
      root: {
        id: 'root',
        name: null,
        layout: 'container',
        repositories: [],
        view: 'list',
        size: null,
        elements: null,
        query: null,
        noteRefs: []
      }
    }
    setDesk(newDesk)
  }, [tab.oid])

  if (!desk) {
    return <div>Loading desk...</div>
  }

  return <RenderedDesk desk={desk} selected={true} />
}

export default RenderedDeskTab
