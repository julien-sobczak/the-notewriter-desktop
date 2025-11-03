import { useState, useEffect, useContext } from 'react'
import { XIcon as CloseIcon, DesktopIcon as DeskIcon } from '@phosphor-icons/react'
import { Desk } from '@renderer/Model'
import { ConfigContext } from '@renderer/ConfigContext'
import { Action, Actions } from './Actions'

type DesktopSidebarProps = {
  onDeskSelected?: (desk: Desk) => void
  onClose?: () => void
}

function DesktopSidebar({ onDeskSelected, onClose }: DesktopSidebarProps) {
  const { config } = useContext(ConfigContext)

  // Read configured repositories (useful to populate the dropdown)
  const staticConfig = config.static

  // Desks in selected repositories
  const [desks, setDesks] = useState<Desk[]>([])

  // Load files when switching to a new repository
  useEffect(() => {
    setDesks(staticConfig.desks || []) // TODO load dynamic desks too
  }, [staticConfig])

  return (
    <div className="DesktopSidebar">
      <Actions>
        <Action icon={<CloseIcon />} onClick={onClose} />
      </Actions>

      {desks.length > 0 && (
        <ul>
          {desks
            .filter((desk) => !desk.template)
            .map((desk: Desk) => (
              <li key={desk.name} onClick={() => onDeskSelected?.(desk)}>
                <DeskIcon size={12} />
                &nbsp;<span className="DeskTitle">{desk.name}</span>
                <br />
                {desk.description && <span className="DeskDescription">{desk.description}</span>}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

export default DesktopSidebar
