import { Desk } from '@renderer/Model'
import RenderedDesk from './RenderedDesk'
import { useState, useEffect } from 'react'

type RenderedDeskTabProps = {
  title: string
  oid: string
}

function RenderedDeskTab({ title, oid }: RenderedDeskTabProps) {
  const [desk, setDesk] = useState<Desk | null>(null)

  useEffect(() => {
    // Load or create a desk based on the oid
    // For now, create a blank desk structure
    const newDesk: Desk = {
      id: oid,
      name: title,
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
  }, [oid, title])

  if (!desk) {
    return <div>Loading desk...</div>
  }

  return <RenderedDesk desk={desk} selected={true} />
}

export default RenderedDeskTab
