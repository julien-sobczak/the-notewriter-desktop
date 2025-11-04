import React, { useState, ReactNode, ReactElement, MouseEvent } from 'react'
import { X as CloseIcon } from '@phosphor-icons/react'

type IndicatorProps = {
  children: ReactNode
}

type SubactionProps = {
  icon: ReactNode
  title?: string
  children?: ReactNode
  selected?: boolean
  onClick?: (event: MouseEvent) => void
}

type ActionProps = {
  icon: ReactNode
  title?: string
  children?: ReactNode // if present, means subactions
  selected?: boolean
  onClick?: (event: MouseEvent) => void
}

type ActionsProps = {
  children: ReactNode
  className?: string
}

export function Indicator({ children }: IndicatorProps) {
  // Just render the children as a non-clickable menu entry
  return (
    <li className="ActionIndicator" tabIndex={-1} style={{ pointerEvents: 'none' }}>
      {children}
    </li>
  )
}

export function Subaction({ icon, title, children, selected, onClick }: SubactionProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault()
    onClick?.(e)
  }
  return (
    <li className={selected ? 'selected' : ''}>
      <a href="#" role="menuitem" title={title} tabIndex={0} onClick={handleClick}>
        {icon} {children}
      </a>
    </li>
  )
}

export function Action({ children }: ActionProps) {
  // This component is only declarative. Behavior is handled in <Actions>.
  return children
}

export function Actions({ children, className }: ActionsProps) {
  const [activeAction, setActiveAction] = useState<ReactElement<ActionProps> | null>(null)

  const handleActionClick = (e: MouseEvent, action: ReactElement<ActionProps>) => {
    e.preventDefault()
    if (action.props.children) {
      setActiveAction(action)
    } else {
      action.props.onClick?.(e)
    }
  }

  const renderActions = () => {
    if (activeAction) {
      return (
        <ul role="menu">
          {/* Subactions */}
          {React.Children.map(activeAction.props.children, (sub) => sub)}

          {/* Close button */}
          <li>
            <a
              href="#"
              role="menuitem"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault()
                setActiveAction(null)
              }}
            >
              <CloseIcon />
            </a>
          </li>
        </ul>
      )
    }

    // Top-level actions
    return (
      <ul role="menu">
        {React.Children.map(children, (child) => {
          // Render Indicator directly
          if (!React.isValidElement<ActionProps>(child)) return null
          if (child.type === Indicator) {
            return child
          }
          return (
            <li className={child.props.selected ? 'selected' : ''}>
              <a
                href="#"
                role="menuitem"
                title={child.props.title}
                tabIndex={0}
                onClick={(e) => handleActionClick(e, child)}
              >
                {child.props.icon}
              </a>
            </li>
          )
        })}
      </ul>
    )
  }

  return <nav className={`Actions${className ? ` ${className}` : ''}`}>{renderActions()}</nav>
}
