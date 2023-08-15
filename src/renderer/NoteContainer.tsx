import { useState, useRef } from 'react';
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
              draggable={selectedLayout === 'free'}
            />
          );
        })}
      </div>
    </div>
  );
}

export default NotesContainer;
