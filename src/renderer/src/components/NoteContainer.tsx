import React, { useState, useRef, useEffect } from 'react'
import {
  RowsIcon as ListIcon,
  SquaresFourIcon as GridIcon,
  StackIcon as FreeIcon,
  XIcon as CloseIcon,
  ListNumbersIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  ShuffleIcon,
  FunnelIcon as FilterIcon,
  TagSimpleIcon as TagIcon,
  AtIcon as AttributeIcon
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
  showTags?: boolean
  showAttributes?: boolean
  showTitle?: boolean
  showBody?: boolean
  showActions?: boolean
  showComment?: boolean
  onClose?: () => void
}

function NoteContainer({
  name = '',
  notes,
  layout = 'list',
  layoutSelectable = true,
  showTags = true,
  showAttributes = true,
  showTitle = true,
  showBody = true,
  showActions = true,
  showComment = true,
  onClose = () => { } // do nothing
}: NoteContainerProps) {
  const [selectedLayout, setSelectedLayout] = useState(layout)
  const [originalNotes, setOriginalNotes] = useState<Note[]>([])
  const [sortedNotes, setSortedNotes] = useState<Note[]>([])
  const [showFilterTags, setShowFilterTags] = useState<boolean>(false)
  const [showFilterAttributes, setShowFilterAttributes] = useState<boolean>(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableAttributes, setAvailableAttributes] = useState<string[]>([])
  const [currentFilterTags, setCurrentFilterTags] = useState<string[]>([])
  const [currentFilterAttributes, setCurrentFilterAttributes] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize and track notes changes
  useEffect(() => {
    if (notes) {
      setOriginalNotes([...notes])
      setSortedNotes([...notes])
    }
  }, [notes])

  // Extract all unique tags and attribute names used by notes in this container
  useEffect(() => {
    if (!notes) {
      setAvailableTags([])
      setAvailableAttributes([])
      return
    }

    const tags = new Set<string>()
    const attributes = new Set<string>()

    notes.forEach((note) => {
      note.tags?.forEach((tag) => tags.add(tag))
      Object.keys(note.attributes || {}).forEach((attributeName) => attributes.add(attributeName))
    })

    const uniqueTags = [...tags]
    const uniqueAttributes = [...attributes]

    setAvailableTags(uniqueTags)
    setAvailableAttributes(uniqueAttributes)
    setCurrentFilterTags((oldFilterTags) => oldFilterTags.filter((tag) => uniqueTags.includes(tag)))
    setCurrentFilterAttributes((oldFilterAttributes) =>
      oldFilterAttributes.filter((attribute) => uniqueAttributes.includes(attribute))
    )
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

  const handleToggleFilterTag = (tag: string) => {
    if (currentFilterTags.includes(tag)) {
      setCurrentFilterTags(currentFilterTags.filter((t) => t !== tag))
    } else {
      setCurrentFilterTags([...currentFilterTags, tag])
    }
  }

  const handleToggleFilterAttribute = (attribute: string) => {
    if (currentFilterAttributes.includes(attribute)) {
      setCurrentFilterAttributes(currentFilterAttributes.filter((a) => a !== attribute))
    } else {
      setCurrentFilterAttributes([...currentFilterAttributes, attribute])
    }
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

  const filteredNotes = sortedNotes.filter((note) => {
    if (currentFilterTags.length > 0) {
      const hasAllTags = currentFilterTags.every((tag) => (note.tags || []).includes(tag))
      if (!hasAllTags) {
        return false
      }
    }
    if (currentFilterAttributes.length > 0) {
      const noteAttributes = Object.keys(note.attributes || {})
      const hasAllAttributes = currentFilterAttributes.every((attribute) =>
        noteAttributes.includes(attribute)
      )
      if (!hasAllAttributes) {
        return false
      }
    }
    return true
  })

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
          {(availableTags.length > 0 || availableAttributes.length > 0) && (
            <Action title="Filter notes" icon={<FilterIcon />}>
              {availableTags.length > 0 && (
                <Subaction
                  title="Tags"
                  selected={showFilterTags}
                  onClick={() => setShowFilterTags(!showFilterTags)}
                  icon={<TagIcon />}
                />
              )}
              {availableAttributes.length > 0 && (
                <Subaction
                  title="Attributes"
                  selected={showFilterAttributes}
                  onClick={() => setShowFilterAttributes(!showFilterAttributes)}
                  icon={<AttributeIcon />}
                />
              )}
            </Action>
          )}
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
      {(showFilterTags || showFilterAttributes) && (
        <ul className="Filter">
          {showFilterTags &&
            availableTags.map((tag) => (
              <li
                key={`tag-${tag}`}
                className={currentFilterTags.includes(tag) ? 'selected' : ''}
                onClick={() => handleToggleFilterTag(tag)}
              >
                #{tag}
              </li>
            ))}
          {showFilterAttributes &&
            availableAttributes.map((attribute) => (
              <li
                key={`attribute-${attribute}`}
                className={currentFilterAttributes.includes(attribute) ? 'selected' : ''}
                onClick={() => handleToggleFilterAttribute(attribute)}
              >
                @{attribute}
              </li>
            ))}
        </ul>
      )}
      <div
        className={classNames(['Content', `Layout${capitalize(selectedLayout)}`])}
        ref={containerRef}
      >
        {filteredNotes?.map((note: Note) => {
          return (
            <RenderedNote
              key={note.oid}
              note={note}
              layout={selectedLayout}
              showActions={showActions}
              showAttributes={showAttributes}
              showBody={showBody}
              showComment={showComment}
              showTags={showTags}
              showTitle={showTitle}
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
