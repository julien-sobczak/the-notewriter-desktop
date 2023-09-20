/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
import React, { useRef } from 'react';
import {
  PencilSimple as EditIcon,
  Copy as DragIcon,
  ArrowUp as MoveUpIcon,
  ArrowDown as MoveDownIcon,
} from '@phosphor-icons/react';
import classNames from 'classnames';
import { Note, Media } from 'shared/model/Note';
import NotFound from '../../assets/404.svg';
import { capitalize } from './helpers';

const { ipcRenderer } = window.electron;

// eslint-disable-next-line import/prefer-default-export
export function formatContent(note: Note, tags: string[] = []): string {
  // Regex to locale links to append target="_blank"
  // Ex: <a href="www.google.com"> => <a target="_blank" href="www.google.com">
  // This allows the main process to capture links and redirect to the browser
  // instead of opening them in the Electron application.
  const reLinks: RegExp = /<a /g;
  note.content = note.content.replaceAll(reLinks, '<a target="_blank" ');

  // Regex to locate media references
  const reOids: RegExp = /oid:([a-zA-Z0-9]{40})/g;
  let m: RegExpExecArray | null;

  const mediasByOids = new Map<string, Media>();
  note.medias.forEach((media) => mediasByOids.set(media.oid, media));

  // Find note OIDs
  const noteOids = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    m = reOids.exec(note.content);
    if (m == null) {
      break;
    }
    noteOids.push(m[1]);
  }

  // Replace by valid paths
  let result = note.content;
  for (const oid of noteOids) {
    let found = false;

    const media = mediasByOids.get(oid);
    if (media) {
      // Media exists

      // Try to find a blob matching every tags
      for (const blob of media.blobs) {
        if (tags.every((tag) => blob.tags.includes(tag))) {
          // Found a potential blob
          const prefix = blob.oid.substring(0, 2);
          result = result.replace(
            `oid:${oid}`,
            `file:${note.workspacePath}/.nt/objects/${prefix}/${blob.oid}`
          );
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // 404 or dangling media or missing blob
      if (media) {
        console.log(`Missing media ${oid}`);
      } else {
        console.log(
          `Missing blob for media ${oid} matching "${tags.join(',')}"`
        );
      }
      result = result.replace(`oid:${oid}`, NotFound);
    }
  }

  return result;
}

// List of attributes that must be hidden (as duplicating information already displayed elsewhere)
const omitAttributes = ['tags', 'title'];

interface LastPosition {
  left?: number;
  top?: number;
}

// See https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example/
type RenderedNoteProps = {
  // Content
  note: Note;
  // Style
  layout?: string;
  showTags?: boolean;
  showAttributes?: boolean;
  // Container
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrag?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
  onMouseStart?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnd?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export default function RenderedNote({
  note,
  layout = 'default',
  showTags = true,
  showAttributes = true,
  draggable = false,
  onDragStart = () => {},
  onDrag = () => {},
  onDragEnd = () => {},
  onMouseStart = () => {},
  onMouseEnd = () => {},
}: RenderedNoteProps) {
  const dragElement = useRef<HTMLDivElement>(null);
  const dragInProgress = useRef<boolean>(false);
  const lastPosition = useRef<LastPosition>({
    left: undefined,
    top: undefined,
  });

  // Remove extra attributes
  const filteredAttributes = Object.fromEntries(
    Object.entries(note.attributes).filter(
      ([key]) => !omitAttributes.includes(key)
    )
  );

  const noteHasMetadata = note.tags || filteredAttributes;
  const metadataVisible = showTags || showAttributes;

  const handleDragClick = (event: React.MouseEvent) => {
    dragInProgress.current = !dragInProgress.current;
    event.stopPropagation();
  };

  // FIXME remove
  // const getDraggableAncestor = (element: HTMLElement) => {
  //   if (element.getAttribute('data-draggable')) return element;
  //   return getDraggableAncestor(element.parentElement);
  // };

  const handleMouseStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (layout !== 'free') return;
    if (dragInProgress.current || dragElement.current === null) return;
    lastPosition.current.left = event.clientX;
    lastPosition.current.top = event.clientY;
    dragElement.current.classList.add('dragging');
    console.log('handleMouseStart');
    window.addEventListener('mousemove', handleMouseMove); // Listen on the windows as the mouse can move anywhere, not just over the dragged element
    onMouseStart(event);
  };

  // Returns the RenderedNote element.
  const getRenderedNote = (
    target: HTMLElement | null | undefined
  ): HTMLElement | null | undefined => {
    if (!target) return undefined;
    if (target.classList.contains('RenderedNote')) {
      return target;
    }
    return getRenderedNote(target.parentElement);
  };
  // Returns the parent of the RenderedNote element.
  const getContainer = (
    target: HTMLElement | null | undefined
  ): HTMLElement | null | undefined => {
    return getRenderedNote(target)?.parentElement;
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (dragInProgress.current || dragElement.current === null) return;
    if (!lastPosition.current.left) {
      lastPosition.current.left = 0;
    }
    if (!lastPosition.current.top) {
      lastPosition.current.top = 0;
    }
    const oldLeft = parseInt(dragElement.current.style.left, 10);
    const oldTop = parseInt(dragElement.current.style.top, 10);
    let newLeft = oldLeft + event.clientX - lastPosition.current.left;
    let newTop = oldTop + event.clientY - lastPosition.current.top;

    // Bound possitions to container to not let a note escape
    const containerElement = getContainer(dragElement.current);
    const noteElement = getRenderedNote(dragElement.current);
    if (newLeft < 0) {
      newLeft = 0;
    }
    if (newTop < 0) {
      newTop = 0;
    }
    if (containerElement && noteElement) {
      if (newLeft > containerElement.offsetWidth - noteElement.offsetWidth) {
        newLeft = containerElement.offsetWidth - noteElement.offsetWidth;
      }
      // Do not enforce boundaries on the bottom. Let the user scrolles instead.
    }

    dragElement.current.style.setProperty('left', `${newLeft}px`);
    dragElement.current.style.setProperty('top', `${newTop}px`);
    lastPosition.current.left = event.clientX;
    lastPosition.current.top = event.clientY;
  };

  const handleMouseEnd = (event: React.MouseEvent<HTMLDivElement>) => {
    if (layout !== 'free') return;
    if (dragInProgress.current || dragElement.current === null) return;
    console.log('handleMouseEnd');
    dragElement.current.classList.remove('dragging');
    window.removeEventListener('mousemove', handleMouseMove);
    onMouseEnd(event);
  };

  const handleMoveUp = (event: React.MouseEvent) => {
    if (dragElement.current === null) return;
    let oldZIndex = parseInt(dragElement.current.style.zIndex, 10);
    if (Number.isNaN(oldZIndex)) {
      oldZIndex = 0;
    }
    const newZIndex = oldZIndex + 10;
    dragElement.current.style.zIndex = `${newZIndex}`;
    event.stopPropagation();
  };
  const handleMoveDown = (event: React.MouseEvent) => {
    if (dragElement.current === null) return;
    let oldZIndex = parseInt(dragElement.current.style.zIndex, 10);
    if (Number.isNaN(oldZIndex)) {
      oldZIndex = 0;
    }
    let newZIndex = oldZIndex - 10;
    newZIndex = Math.max(newZIndex, 0);
    dragElement.current.style.zIndex = `${newZIndex}`;
    event.stopPropagation();
  };
  const handleMouseOut = (event: React.MouseEvent) => {
    console.log(
      `mouseout ${window.innerWidth}x${window.innerHeight} vs ${event.clientX}x${event.clientY}`
    ); // FIXME remove
    event.stopPropagation();
  };

  const handleEdit = (event: React.MouseEvent) => {
    ipcRenderer.sendMessage(
      'edit',
      note.workspaceSlug,
      note.relativePath,
      note.line
    );
    event.stopPropagation();
  };

  return (
    <div
      ref={dragElement}
      className={classNames(['RenderedNote', `Layout${capitalize(layout)}`])}
      data-draggable="true"
      key={note.oid}
      id={note.oid}
      // Support Drag & Drop API to move notes between containers
      // See https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
      draggable={draggable && dragInProgress.current ? 'true' : 'false'}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
    >
      <div
        className="Actions"
        // Support basic drag to move notes inside a free container.
        // We listen on actions panel to keep the note content easily selectable.
        // We use standard mouse events to drag freely notes without the ghosting effect
        // See https://blog.coderfy.io/creating-a-draggable-and-resizable-box
        onMouseDown={handleMouseStart}
        onMouseUp={handleMouseEnd}
        onMouseOut={handleMouseOut} // FIXME BUG we need to stop drag when the mouse is released outside the viewport. This solution doesn't seem to work...
      >
        <nav>
          <ul>
            <li>
              <button type="button" onClick={handleDragClick}>
                <DragIcon />
              </button>
              {layout === 'free' && (
                <button type="button" onClick={handleMoveUp}>
                  <MoveUpIcon />
                </button>
              )}
              {layout === 'free' && (
                <button type="button" onClick={handleMoveDown}>
                  <MoveDownIcon />
                </button>
              )}
              <button type="button" onClick={handleEdit}>
                <EditIcon />
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div
        className="RenderedNoteTitle"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: note.title }}
      />
      <div
        className="RenderedNoteContent"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: formatContent(note, ['preview']) }}
      />
      {metadataVisible && noteHasMetadata && (
        <div className="RenderedNoteMetadata">
          {showTags && note.tags && (
            <ul>
              {note.tags.map((tag: string) => {
                return <li key={tag}>#{tag}</li>;
              })}
            </ul>
          )}
          {showAttributes && filteredAttributes && (
            <ul>
              {Object.entries(filteredAttributes).map(([key, value]: any) => {
                return (
                  <li key={key}>
                    @{key}: {value}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {note.comment && (
        <div
          className="RenderedNoteComment"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: note.comment }}
        />
      )}
    </div>
  );
}
