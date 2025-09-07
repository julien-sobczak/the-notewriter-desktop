/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {
  useState,
  ReactNode,
  ReactElement,
  KeyboardEvent,
  MouseEvent,
} from 'react';
import { X as CloseIcon } from '@phosphor-icons/react';

type SubactionProps = {
  icon: ReactNode;
  title?: string;
  children?: ReactNode;
  onClick?: () => void;
};

type ActionProps = {
  icon: ReactNode;
  title?: string;
  children?: ReactNode; // if present, means subactions
  onClick?: () => void;
};

type ActionsProps = {
  children: ReactNode;
};

export function Subaction({ icon, title, children, onClick }: SubactionProps) {
  const handleClick = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    onClick?.();
  };

  return (
    <li>
      <a
        href="#"
        role="menuitem"
        title={title}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick(e);
        }}
      >
        {icon} {children}
      </a>
    </li>
  );
}

export function Action({ children }: ActionProps) {
  // This component is only declarative. Behavior is handled in <Actions>.
  return children;
}

export function Actions({ children }: ActionsProps) {
  const [activeAction, setActiveAction] =
    useState<ReactElement<ActionProps> | null>(null);

  const handleActionClick = (
    e: MouseEvent | KeyboardEvent,
    action: ReactElement<ActionProps>,
  ) => {
    e.preventDefault();
    if (action.props.children) {
      setActiveAction(action);
    } else {
      action.props.onClick?.();
    }
  };

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
                e.preventDefault();
                setActiveAction(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveAction(null);
              }}
            >
              <CloseIcon />
            </a>
          </li>
        </ul>
      );
    }

    // Top-level actions
    return (
      <ul role="menu">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement<ActionProps>(child)) return null;
          return (
            <li>
              <a
                href="#"
                role="menuitem"
                title={child.props.title}
                tabIndex={0}
                onClick={(e) => handleActionClick(e, child)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    handleActionClick(e, child);
                }}
              >
                {child.props.icon}
              </a>
            </li>
          );
        })}
      </ul>
    );
  };

  return <nav className="Actions">{renderActions()}</nav>;
}
