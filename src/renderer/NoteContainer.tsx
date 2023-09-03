import React, { useState, useRef } from 'react';
import { Note } from 'shared/model/Note';
import {
  CiGrid2H as ListIcon,
  CiGrid41 as GridIcon,
  CiGrid42 as FreeIcon,
} from 'react-icons/ci';
import classNames from 'classnames';
import RenderedNote from './RenderedNote';
import { capitalize } from './helpers';

type NotesContainerProps = {
  notes: Note[] | undefined;
  layout?: string;
};

function NotesContainer({ notes, layout = 'list' }: NotesContainerProps) {
  const [selectedLayout, setSelectedLayout] = useState(layout);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    // Add the target element's id to the data transfer object
    if (!event.target || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'all'; // detect special keys in DragEvent (ex: useful to detect shift to clone notes)
    event.dataTransfer.setData('text/plain', event.currentTarget.id);
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.target || !event.dataTransfer) return;
    // const id = event.dataTransfer.getData('text/plain');
    console.log('ici', event, event.shiftKey); // TODO remove
    // TODO clone note if event.shiftKey <= seems to be true only on 'drag' event... 😭
    event.currentTarget.style.left = `${event.clientX}px`;
    event.currentTarget.style.top = `${event.clientY}px`;
  };

  const changeLayout = (newLayout: string) => {
    if (!containerRef.current) return;

    const parentWidth = containerRef.current.offsetWidth;
    const parentHeight = containerRef.current.offsetHeight;
    const children = Object.values(
      containerRef.current.childNodes
    ) as HTMLElement[];
    console.log('parent', parentWidth, parentHeight); // TODO remove

    if (newLayout === 'free') {
      const positions = [];
      for (const child of children) {
        console.log(child.tagName, child.offsetLeft, child.offsetTop); // TODO remove
        positions.push({
          offsetLeft: child.offsetLeft,
          offsetTop: child.offsetTop,
          offsetWidth: child.offsetWidth,
          offsetHeight: child.offsetHeight,
        });
      }

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const position = positions[i];
        child.style.position = `absolute`;
        // FIXME left and top seems too large
        // TODO use percent to keep the overall placements when switching to a larger/smaller screen
        child.style.left = `${position.offsetLeft}px`;
        child.style.top = `${position.offsetTop}px`;
        child.style.width = `${position.offsetWidth}px`;
        child.style.height = `${position.offsetHeight}px`;
      }
    } else {
      // Clear potential CSS changes when using 'free'
      for (const child of children) {
        child.style.position = ``;
        child.style.left = ``;
        child.style.top = ``;
        child.style.width = ``;
        child.style.height = ``;
      }
    }
    setSelectedLayout(newLayout);
  };

  return (
    <div className="NoteContainer">
      <div className="Actions">
        <nav>
          <ul>
            <li>
              <button
                type="button"
                className={classNames({ selected: selectedLayout === 'list' })}
                onClick={() => changeLayout('list')}
              >
                <ListIcon />
              </button>
              <button
                type="button"
                className={classNames({ selected: selectedLayout === 'grid' })}
                onClick={() => changeLayout('grid')}
              >
                <GridIcon />
              </button>
              <button
                type="button"
                className={classNames({ selected: selectedLayout === 'free' })}
                onClick={() => changeLayout('free')}
              >
                <FreeIcon />
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div
        className={classNames([
          'Content',
          `Layout${capitalize(selectedLayout)}`,
        ])}
        ref={containerRef}
      >
        {notes?.map((note: Note) => {
          return (
            <RenderedNote
              key={note.oid}
              note={note}
              layout={selectedLayout}
              draggable={selectedLayout === 'free'}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          );
        })}
      </div>
    </div>
  );
}

export default NotesContainer;
