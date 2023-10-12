/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
import React, { useRef, useContext } from 'react';
import {
  ArrowsOutCardinal as MoveIcon,
  PencilSimple as EditIcon,
  Copy as DragIcon,
  ArrowUp as MoveUpIcon,
  ArrowDown as MoveDownIcon,
  Star,
} from '@phosphor-icons/react';
import classNames from 'classnames';
import { Note, Media, Blob, Bookmark } from 'shared/Model';
import { ConfigContext } from './ConfigContext';
import NotFound from '../../assets/404.svg';
import { capitalize } from './helpers';
import NoteKind from './NoteKind';

// eslint-disable-next-line import/prefer-default-export
export function formatContent(note: Note, tags: string[] = []): string {
  // Regex to locate media references
  const reOids: RegExp = /<media oid="([a-zA-Z0-9]{40})".*\/>/g;
  let m: RegExpExecArray | null;

  // Create a map of all note medias for quick access
  const mediasByOids = new Map<string, Media>();
  note.medias.forEach((media) => mediasByOids.set(media.oid, media));

  let result = note.content;

  // Extract <media /> tags
  const mediaTags = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    m = reOids.exec(result);
    if (m == null) {
      break;
    }
    mediaTags.push(m[0]);
  }

  // Parse tags and replace by standard HTML tags
  for (const mediaTag of mediaTags) {
    let oid: string = '';
    let alt: string = '';
    let title: string = '';
    const indexOID = mediaTag.indexOf('oid="');
    const indexAlt = mediaTag.indexOf('alt="');
    const indexTitle = mediaTag.indexOf('title="');
    if (indexOID !== -1) {
      const indexStart = indexOID + 'oid="'.length;
      const indexEnd = mediaTag.indexOf('"', indexStart);
      oid = mediaTag.substring(indexStart, indexEnd);
    }
    if (indexAlt !== -1) {
      const indexStart = indexAlt + 'alt="'.length;
      const indexEnd = mediaTag.indexOf('"', indexStart);
      alt = mediaTag.substring(indexStart, indexEnd);
    }
    if (indexTitle !== -1) {
      const indexStart = indexAlt + 'title="'.length;
      const indexEnd = mediaTag.indexOf('"', indexStart);
      title = mediaTag.substring(indexStart, indexEnd);
    }

    if (oid === '' || !mediasByOids.has(oid)) {
      // 404 or dangling media or missing blob
      console.log(`Missing media ${oid}`, mediasByOids);
      result = result.replace(
        mediaTag,
        `<img src="${NotFound}" class="missing" />`
      );
      continue;
    }

    const media = mediasByOids.get(oid);
    if (!media) {
      // already managed in above condition
      continue;
    }
    // Try to find a blob matching every tags
    let foundBlob: Blob | null = null;
    for (const blob of media.blobs) {
      if (media.kind === 'video' && blob.mime.startsWith('image/')) {
        // Ignore for now the blob containing the first frame of videos
        continue;
      }
      if (tags.every((tag) => blob.tags.includes(tag))) {
        // Found a potential blob
        foundBlob = blob;
        break;
      }
    }
    if (!foundBlob) {
      console.log(`Missing blob for media ${oid} matching "${tags.join(',')}"`);

      // Fallback to the first blob
      if (media.blobs.length === 0) {
        result = result.replace(
          mediaTag,
          `<img src="${NotFound}" class="missing" />`
        );
        continue;
      }
      foundBlob = media.blobs[0];
      if (media.kind === 'video' && foundBlob.mime.startsWith('image/')) {
        // Ignore for now the blob containing the first frame of videos
        foundBlob = media.blobs[1];
      }
    }

    const blob = foundBlob;
    const prefix = blob.oid.substring(0, 2);
    const blobPath = `${note.workspacePath}/.nt/objects/${prefix}/${blob.oid}`;
    if (media.kind === 'picture') {
      result = result.replace(
        mediaTag,
        `<img src="file:${blobPath}" alt="${alt}" title="${title}" />`
      );
      continue;
    }
    if (media.kind === 'audio') {
      result = result.replace(
        mediaTag,
        `<audio controls title="${title}"><source src="file:${blobPath}" type="${blob.mime}"></audio>`
      );
      continue;
    }
    if (media.kind === 'video') {
      result = result.replace(
        mediaTag,
        `<video controls title="${title}"><source src="file:${blobPath}" type="${blob.mime}"></video>`
      );
      continue;
    }

    // Use a standard <a> otherwise to redirect to the raw file otherwise
    let label = 'link';
    if (title !== '') {
      label = 'Document';
    }
    result = result.replace(
      mediaTag,
      `<a target="_blank" href="file:${blobPath}" title="${title}">${label}</a>`
    );
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
  showTitle?: boolean;
  showActions?: boolean;
  showComment?: boolean;
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
  showTitle = true,
  showActions = true,
  showComment = true,
  draggable = false,
  onDragStart = () => {},
  onDrag = () => {},
  onDragEnd = () => {},
  onMouseStart = () => {},
  onMouseEnd = () => {},
}: RenderedNoteProps) {
  const { config, dispatch } = useContext(ConfigContext);

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

  const handleMouseStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (layout !== 'free') return;
    if (dragInProgress.current || dragElement.current === null) return;
    lastPosition.current.left = event.clientX;
    lastPosition.current.top = event.clientY;
    dragElement.current.classList.add('dragging');
    console.log('handleMouseStart');
    // We listen on the window as the mouse can move anywhere, not just over the dragged element
    window.addEventListener('mousemove', handleMouseMove);
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
    // console.log(
    //   `mouseout ${window.innerWidth}x${window.innerHeight} vs ${event.clientX}x${event.clientY}`
    // ); // FIXME remove
    event.stopPropagation();
  };

  const handleEdit = (event: React.MouseEvent) => {
    const { ipcRenderer } = window.electron;
    ipcRenderer.sendMessage(
      'edit',
      note.workspaceSlug,
      note.relativePath,
      note.line
    );
    event.stopPropagation();
  };

  const handleMove = (event: React.MouseEvent) => {
    event?.stopPropagation();
  };

  const handleBookmark = () => {
    const bookmark: Bookmark = {
      workspaceSlug: note.workspaceSlug,
      noteOID: note.oid,
      noteKind: note.kind,
      noteTitle: note.title,
      noteRelativePath: note.relativePath,
      noteLine: note.line,
    };
    dispatch({
      type: 'add-bookmark',
      payload: bookmark,
    });
  };

  let bookmarked = false;
  if (config.dynamic && config.dynamic.bookmarks) {
    bookmarked =
      config.dynamic.bookmarks.filter(
        (bookmark) => bookmark.noteOID === note.oid
      ).length > 0;
  }

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
      {showActions && (
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
                <button type="button" onClick={handleBookmark} title="Bookmark">
                  <Star weight={bookmarked ? 'fill' : 'thin'} />
                </button>
                <button type="button" onClick={handleMove} title="Move inside">
                  <MoveIcon />
                </button>
                <button
                  type="button"
                  onClick={handleDragClick}
                  title="Drag outside"
                >
                  <DragIcon />
                </button>
                {layout === 'free' && (
                  <button type="button" onClick={handleMoveUp} title="Layer up">
                    <MoveUpIcon />
                  </button>
                )}
                {layout === 'free' && (
                  <button
                    type="button"
                    onClick={handleMoveDown}
                    title="Layer down"
                  >
                    <MoveDownIcon />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleEdit}
                  title="Edit in external editor"
                >
                  <EditIcon />
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
      {showTitle && (
        <div className="RenderedNoteTitle">
          <NoteKind value={note.kind} />
          <span
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: note.title,
            }}
          />
        </div>
      )}
      <div
        className="RenderedNoteContent"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: formatContent(note, ['preview']) }}
      />
      {metadataVisible && noteHasMetadata && (
        <div className="RenderedNoteMetadata">
          {showTags && note.tags && note.tags.length > 0 && (
            <ul>
              {note.tags.map((tag: string) => {
                return <li key={tag}>#{tag}</li>;
              })}
            </ul>
          )}
          {showAttributes &&
            filteredAttributes &&
            Object.keys(filteredAttributes).length > 0 && (
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
      {showComment && note.comment && (
        <div
          className="RenderedNoteComment"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: note.comment }}
        />
      )}
    </div>
  );
}
