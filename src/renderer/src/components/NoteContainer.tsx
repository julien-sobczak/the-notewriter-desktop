import React, { useState, useRef, useEffect } from 'react'
import {
  RowsIcon as ListIcon,
  SquaresFourIcon as GridIcon,
  StackIcon as FreeIcon,
  XIcon as CloseIcon,
  ListNumbersIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  ShuffleIcon
} from '@phosphor-icons/react'
import classNames from 'classnames'
import { Note } from '@renderer/Model'
import RenderedNote from './RenderedNote'
import { Action, Actions, Subaction } from './Actions'
import { capitalize } from '@renderer/helpers/strings'

type NoteContainerProps = {
  name?: string | null | undefined
  notes: Note[] | undefined
  layout?: string
  layoutSelectable?: boolean
  onClose?: () => void
}

function NoteContainer({
  name = '',
  notes,
  layout = 'list',
  layoutSelectable = true,
  onClose = () => {} // do nothing
}: NoteContainerProps) {
  const [selectedLayout, setSelectedLayout] = useState(layout)
  const [originalNotes, setOriginalNotes] = useState<Note[]>([])
  const [sortedNotes, setSortedNotes] = useState<Note[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize and track notes changes
  useEffect(() => {
    if (notes) {
      setOriginalNotes([...notes])
      setSortedNotes([...notes])
    }
  }, [notes])

  // Fisher-Yates shuffle algorithm
  const shuffleArray = (array: Note[]): Note[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const handleSortAscending = () => {
    setSortedNotes([...originalNotes])
  }

  const handleSortDescending = () => {
    setSortedNotes([...originalNotes].reverse())
  }

  const handleShuffle = () => {
    setSortedNotes(shuffleArray(originalNotes))
  }

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    // Add the target element's id to the data transfer object
    if (!event.target || !event.dataTransfer) return
    event.dataTransfer.effectAllowed = 'all' // detect special keys in DragEvent (ex: useful to detect shift to clone notes)
    event.dataTransfer.setData('text/plain', event.currentTarget.id)
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.target || !event.dataTransfer) return
    // const id = event.dataTransfer.getData('text/plain');
    // console.log('ici', event, event.shiftKey); // TODO remove
    // TODO clone note if event.shiftKey <= seems to be true only on 'drag' event... 😭
    event.currentTarget.style.left = `${event.clientX}px`
    event.currentTarget.style.top = `${event.clientY}px`
  }

  /* Prevent text selection while dragging otherwise drag can stop abrutly */
  const handleMouseStart = () => {
    if (!containerRef.current) return
    console.log('+prevent-select')
    containerRef.current.classList.add('prevent-select')
  }
  const handleMouseEnd = () => {
    if (!containerRef.current) return
    console.log('-prevent-select')
    containerRef.current.classList.remove('prevent-select')
  }

  const changeLayout = (newLayout: string) => {
    if (!containerRef.current) return

    const children = Object.values(containerRef.current.childNodes) as HTMLElement[]
    // console.log('parent', containerRef.current.offsetWidth, containerRef.current.offsetHeight); // TODO remove

    if (newLayout === 'free') {
      const positions: any[] = []
      for (const child of children) {
        // console.log(child.tagName, child.offsetLeft, child.offsetTop); // TODO remove
        positions.push({
          offsetLeft: child.offsetLeft,
          offsetTop: child.offsetTop,
          offsetWidth: child.offsetWidth,
          offsetHeight: child.offsetHeight
        })
      }

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const position = positions[i]
        child.style.position = `absolute`
        // FIXME left and top seems too large
        // TODO use percent to keep the overall placements when switching to a larger/smaller screen
        child.style.left = `${position.offsetLeft}px`
        child.style.top = `${position.offsetTop}px`
        child.style.width = `${position.offsetWidth}px`
        child.style.height = `${position.offsetHeight}px`
      }
    } else {
      // Clear potential CSS changes when using 'free'
      for (const child of children) {
        child.style.position = ``
        child.style.left = ``
        child.style.top = ``
        child.style.width = ``
        child.style.height = ``
      }
    }
    setSelectedLayout(newLayout)
  }

  return (
    <div className="NoteContainer">
      <div className="Header">
        {name && <div className="Name">{name}</div>}
        <Actions className="NoteContainerActions">
          <Action title="Sort notes" icon={<ListNumbersIcon />}>
            <Subaction
              title="Sort ascending"
              onClick={handleSortAscending}
              icon={<SortAscendingIcon />}
            />
            <Subaction
              title="Sort descending"
              onClick={handleSortDescending}
              icon={<SortDescendingIcon />}
            />
            <Subaction title="Shuffle" onClick={handleShuffle} icon={<ShuffleIcon />} />
          </Action>
          {layoutSelectable && (
            <Action title="List layout" onClick={() => changeLayout('list')} icon={<ListIcon />} />
          )}
          {layoutSelectable && (
            <Action title="Grid layout" onClick={() => changeLayout('grid')} icon={<GridIcon />} />
          )}
          {layoutSelectable && (
            <Action title="Free layout" onClick={() => changeLayout('free')} icon={<FreeIcon />} />
          )}
          {onClose && <Action title="Close panel" onClick={onClose} icon={<CloseIcon />} />}
        </Actions>
      </div>
      <div
        className={classNames(['Content', `Layout${capitalize(selectedLayout)}`])}
        ref={containerRef}
      >
        {sortedNotes?.map((note: Note) => {
          return (
            <RenderedNote
              key={note.oid}
              note={note}
              layout={selectedLayout}
              draggable={selectedLayout === 'free'}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onMouseStart={handleMouseStart}
              onMouseEnd={handleMouseEnd}
            />
          )
        })}
      </div>
    </div>
  )
}

export default NoteContainer
