import { ReactNode } from 'react'
import { XIcon as CloseIcon } from '@phosphor-icons/react'
import { Actions, Action } from './Actions'

function Aside({ children, onClose = () => {} }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="Aside">
      <Actions>
        <Action icon={<CloseIcon />} title="Close" onClick={onClose} />
      </Actions>
      <div className="AsideContent">{children}</div>
    </div>
  )
}

export default Aside
