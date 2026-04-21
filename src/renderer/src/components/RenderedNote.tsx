import React, { useRef, useContext, useState, useEffect } from 'react'
import {
  ArrowsOutCardinalIcon as MoveIcon,
  PencilSimpleIcon as EditIcon,
  CopyIcon as DragIcon,
  ArrowUpIcon as MoveUpIcon,
  ArrowDownIcon as MoveDownIcon,
  TextAlignLeftIcon as DefaultModeIcon,
  ListBulletsIcon as ListModeIcon,
  FunnelIcon as FilterIcon,
  SmileyIcon as EmojiIcon,
  TagSimpleIcon as TagIcon,
  AtIcon as AttributeIcon,
  StarIcon as BookmarkIcon,
  LinkIcon as LinkIcon,
  PlayIcon as RunHooksIcon
} from '@phosphor-icons/react'
import classNames from 'classnames'
import { Note, Bookmark, extractSourceURL, ListItem } from '@renderer/Model'
import NoteType from './NoteType'
import Markdown from './Markdown'
import RenderedMetadata, { RenderedAttributes, RenderedTags } from './RenderedMetadata'
import { Action, Actions, Subaction } from './Actions'
import HoveredNote from './HoveredNote'
import { ConfigContext } from '@renderer/ConfigContext'
import { capitalize } from '@renderer/helpers/strings'
import { replaceMediasByLinks } from '@renderer/helpers/markdown'

function formatContent(note: Note, tags: string[] = []): string {
  return replaceMediasByLinks(note.body, note.medias, tags)
}

interface LastPosition {
  left?: number
  top?: number
}

// See https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example/
type RenderedNoteProps = {
  // Content
  note: Note
  // Style
  layout?: string
  viewMode?: 'default' | 'list'
  showTags?: boolean
  showAttributes?: boolean
  showTitle?: boolean
  showBody?: boolean
  showActions?: boolean
  showComment?: boolean
  // Filters (only used when viewMode="list")
  filterTags?: string[]
  filterAttributes?: string[]
  filterEmojis?: string[]
  // Container
  draggable?: boolean
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void
  onDrag?: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void
  onMouseStart?: (event: React.MouseEvent<HTMLDivElement>) => void
  onMouseEnd?: (event: React.MouseEvent<HTMLDivElement>) => void
}

export default function RenderedNote({
  note,
  layout = 'default',
  viewMode = 'default',
  showTags = true,
  showAttributes = true,
  showTitle = true,
  showBody = true,
  showActions = true,
  showComment = true,
  filterTags = [],
  filterAttributes = [],
  filterEmojis = [],
  draggable = false,
  onDragStart = () => { },
  onDrag = () => { },
  onDragEnd = () => { },
  onMouseStart = () => { },
  onMouseEnd = () => { }
}: RenderedNoteProps) {
  const { config, dispatch } = useContext(ConfigContext)
  const repositoryConfig = config.repositories[note.repositorySlug]

  // List view mode management
  const [currentViewMode, setCurrentViewMode] = useState<'default' | 'list'>(viewMode)
  const [showFilterTags, setShowFilterTags] = useState<boolean>(false)
  const [showFilterAttributes, setShowFilterAttributes] = useState<boolean>(false)
  const [showFilterEmojis, setShowFilterEmojis] = useState<boolean>(false)
  const [currentFilterText, setCurrentFilterText] = useState<string>('')
  const [currentFilterTags, setCurrentFilterTags] = useState<string[]>(filterTags)
  const [currentFilterAttributes, setCurrentFilterAttributes] = useState<string[]>(filterAttributes)
  const [currentFilterEmojis, setCurrentFilterEmojis] = useState<string[]>(filterEmojis)
  const [filteredItems, setFilteredItems] = useState<ListItem[]>([])

  // Wikilink management
  const [hoveredNote, setHoveredNote] = useState<Note | null>(null)

  // Update filters when props change (for list view mode)
  useEffect(() => {
    setCurrentViewMode(viewMode)
    setCurrentFilterTags(filterTags)
    setCurrentFilterAttributes(filterAttributes)
    setCurrentFilterEmojis(filterEmojis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  const handleListMode = () => {
    setCurrentViewMode('list')
    setFilteredItems(note.items?.children || [])
  }
  const handleDefaultMode = () => {
    setCurrentViewMode('default')
  }

  // Refresh the list item when filters on metadata change
  useEffect(() => {
    filterItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilterTags, currentFilterAttributes, currentFilterEmojis])

  // Determine the filter items based on currently selected filters
  const filterItems = () => {
    if (!note.items?.children) {
      setFilteredItems([])
      return
    }

    // IMPROVEMENT Only immediate children are filtered. Ideally, we would like to filter recursively.
    const newFilteredItems = note.items.children.filter((item) => {
      // Implementation: We consider an item to match the filters if it or any of its children match.

      // Filter by text
      if (currentFilterText.trim().length > 0) {
        const textMatch =
          item.text?.toLowerCase().includes(currentFilterText.toLowerCase()) ||
          (item.children &&
            item.children.some((child) =>
              child.text?.toLowerCase().includes(currentFilterText.toLowerCase())
            ))
        if (!textMatch) return false
      }

      // Filter by tags
      if (currentFilterTags.length > 0) {
        // Collect all tags of the item and its children
        const allTags = (item.tags || []).concat(
          item.children?.flatMap((child) => child.tags) || []
        )
        const hasAllTags = currentFilterTags.every((tag) => allTags.includes(tag))
        if (!hasAllTags) {
          return false
        }
      }
      // Filter by attribute names
      if (currentFilterAttributes.length > 0) {
        // Collect all attributes of the item and its children
        const allAttributes = (Object.keys(item.attributes) || []).concat(
          item.children?.flatMap((child) => Object.keys(child.attributes)) || []
        )
        const hasAllAttributes = currentFilterAttributes.every((attribute) =>
          allAttributes.includes(attribute)
        )
        if (!hasAllAttributes) {
          return false
        }
      }
      // Filter by emojis
      if (currentFilterEmojis.length > 0) {
        // Collect all emojis of the item and its children
        const allEmojis = (item.emojis || []).concat(
          item.children?.flatMap((child) => child.emojis) || []
        )
        const hasAllEmojis = currentFilterEmojis.every((emoji) => allEmojis.includes(emoji))
        if (!hasAllEmojis) {
          return false
        }
      }
      return true
    })
    setFilteredItems(newFilteredItems)
  }
  const handleToggleFilterEmoji = (emoji: string) => {
    if (currentFilterEmojis.includes(emoji)) {
      setCurrentFilterEmojis(currentFilterEmojis.filter((e) => e !== emoji))
    } else {
      setCurrentFilterEmojis([...currentFilterEmojis, emoji])
    }
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

  const handleWikilinkClick = async (wikilink: string) => {
    const foundHoveredNote: Note = await window.api.findByWikilink(note.repositorySlug, wikilink)
    if (foundHoveredNote) {
      setHoveredNote(foundHoveredNote)
      console.log(`Found note ${foundHoveredNote.oid} ${foundHoveredNote.longTitle}...`)
    } else {
      setHoveredNote(null)
    }
  }
  const handleWikilinkClose = () => {
    setHoveredNote(null)
  }

  const dragElement = useRef<HTMLDivElement>(null)
  const dragInProgress = useRef<boolean>(false)
  const lastPosition = useRef<LastPosition>({
    left: undefined,
    top: undefined
  })

  const metadataVisible = showTags || showAttributes

  const handleDragClick = (event: React.MouseEvent) => {
    dragInProgress.current = !dragInProgress.current
    event.stopPropagation()
  }

  const handleMouseStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (layout !== 'free') return
    if (dragInProgress.current || dragElement.current === null) return
    lastPosition.current.left = event.clientX
    lastPosition.current.top = event.clientY
    dragElement.current.classList.add('dragging')
    console.log('handleMouseStart')
    // We listen on the window as the mouse can move anywhere, not just over the dragged element
    window.addEventListener('mousemove', handleMouseMove)
    onMouseStart(event)
  }

  // Returns the RenderedNote element.
  const getRenderedNote = (
    target: HTMLElement | null | undefined
  ): HTMLElement | null | undefined => {
    if (!target) return undefined
    if (target.classList.contains('RenderedNote')) {
      return target
    }
    return getRenderedNote(target.parentElement)
  }
  // Returns the parent of the RenderedNote element.
  const getContainer = (target: HTMLElement | null | undefined): HTMLElement | null | undefined => {
    return getRenderedNote(target)?.parentElement
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (dragInProgress.current || dragElement.current === null) return
    if (!lastPosition.current.left) {
      lastPosition.current.left = 0
    }
    if (!lastPosition.current.top) {
      lastPosition.current.top = 0
    }
    const oldLeft = parseInt(dragElement.current.style.left, 10)
    const oldTop = parseInt(dragElement.current.style.top, 10)
    let newLeft = oldLeft + event.clientX - lastPosition.current.left
    let newTop = oldTop + event.clientY - lastPosition.current.top

    // Bound possitions to container to not let a note escape
    const containerElement = getContainer(dragElement.current)
    const noteElement = getRenderedNote(dragElement.current)
    if (newLeft < 0) {
      newLeft = 0
    }
    if (newTop < 0) {
      newTop = 0
    }
    if (containerElement && noteElement) {
      if (newLeft > containerElement.offsetWidth - noteElement.offsetWidth) {
        newLeft = containerElement.offsetWidth - noteElement.offsetWidth
      }
      // Do not enforce boundaries on the bottom. Let the user scrolles instead.
    }

    dragElement.current.style.setProperty('left', `${newLeft}px`)
    dragElement.current.style.setProperty('top', `${newTop}px`)
    lastPosition.current.left = event.clientX
    lastPosition.current.top = event.clientY
  }

  const handleMouseEnd = (event: React.MouseEvent<HTMLDivElement>) => {
    if (layout !== 'free') return
    if (dragInProgress.current || dragElement.current === null) return
    console.log('handleMouseEnd')
    dragElement.current.classList.remove('dragging')
    window.removeEventListener('mousemove', handleMouseMove)
    onMouseEnd(event)
  }

  const handleMoveUp = (event: React.MouseEvent) => {
    if (dragElement.current === null) return
    let oldZIndex = parseInt(dragElement.current.style.zIndex, 10)
    if (Number.isNaN(oldZIndex)) {
      oldZIndex = 0
    }
    const newZIndex = oldZIndex + 10
    dragElement.current.style.zIndex = `${newZIndex}`
    event.stopPropagation()
  }
  const handleMoveDown = (event: React.MouseEvent) => {
    if (dragElement.current === null) return
    let oldZIndex = parseInt(dragElement.current.style.zIndex, 10)
    if (Number.isNaN(oldZIndex)) {
      oldZIndex = 0
    }
    let newZIndex = oldZIndex - 10
    newZIndex = Math.max(newZIndex, 0)
    dragElement.current.style.zIndex = `${newZIndex}`
    event.stopPropagation()
  }
  const handleMouseOut = (event: React.MouseEvent) => {
    event.stopPropagation()
  }

  const handleEdit = (event: React.MouseEvent) => {
    // Send a message to the main process
    window.api.edit(note.repositorySlug, note.relativePath, note.line)
    event.stopPropagation()
  }

  const handleMove = (event: React.MouseEvent) => {
    event?.stopPropagation()
  }

  const handleBookmark = () => {
    const bookmark: Bookmark = {
      repositorySlug: note.repositorySlug,
      noteOID: note.oid,
      noteType: note.type,
      noteLongTitle: note.longTitle,
      noteRelativePath: note.relativePath,
      noteLine: note.line
    }
    dispatch({
      type: 'add-bookmark',
      payload: bookmark
    })
  }

  const handleRunHooks = async (event: React.MouseEvent) => {
    console.log('Running hooks for note:', note.wikilink)
    event.stopPropagation()

    try {
      const result = await window.api.runHooks(note)
      console.log('Hook execution result:', result)
      // IMPROVEMENT: output message to an application footer (not existing for now)
    } catch (error) {
      console.error('Error running hooks:', error)
      // IMPROVEMENT: output error message to an application footer (not existing for now)
    }
  }

  let bookmarked = false
  if (config.config && config.config.bookmarks) {
    bookmarked =
      config.config.bookmarks.filter((bookmark: Bookmark) => bookmark.noteOID === note.oid).length >
      0
  }

  const sourceURL = extractSourceURL(note)

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
      {hoveredNote && <HoveredNote note={hoveredNote} onClose={handleWikilinkClose} />}
      {showActions && (
        <div
          // Support basic drag to move notes inside a free container.
          // We listen on actions panel to keep the note content easily selectable.
          // We use standard mouse events to drag freely notes without the ghosting effect
          // See https://blog.coderfy.io/creating-a-draggable-and-resizable-box
          onMouseDown={handleMouseStart}
          onMouseUp={handleMouseEnd}
          onMouseOut={handleMouseOut} // FIXME BUG we need to stop drag when the mouse is released outside the viewport. This solution doesn't seem to work...
        >
          <Actions className="RenderedNoteActions">
            {sourceURL && (
              <Action
                title="Follow source"
                key="follow-source"
                icon={<LinkIcon />}
                onClick={() => window.api.browseUrl(sourceURL)}
              />
            )}
            <Action
              title="Bookmark"
              key="bookmark"
              onClick={handleBookmark}
              icon={<BookmarkIcon weight={bookmarked ? 'fill' : 'thin'} />}
            />
            <Action
              title="Move inside"
              key="move-inside"
              onClick={handleMove}
              icon={<MoveIcon />}
            />
            <Action
              title="Drag outside"
              key="drag-outside"
              onClick={handleDragClick}
              icon={<DragIcon />}
            />

            {currentViewMode !== 'default' && note.items?.children && (
              <Action
                title="Default mode"
                key="default-mode"
                onClick={handleDefaultMode}
                icon={<DefaultModeIcon />}
              />
            )}
            {currentViewMode !== 'list' && note.items?.children && (
              <Action
                title="List mode"
                key="list-mode"
                onClick={handleListMode}
                icon={<ListModeIcon />}
              />
            )}
            {currentViewMode === 'list' && (
              <Action title="Filter items" icon={<FilterIcon />}>
                {note.items?.tags && (
                  <Subaction
                    title="Tags"
                    selected={showFilterTags}
                    onClick={() => {
                      setShowFilterTags(!showFilterTags)
                    }}
                    icon={<TagIcon />}
                  />
                )}
                {note.items?.attributes && (
                  <Subaction
                    title="Attributes"
                    selected={showFilterAttributes}
                    onClick={() => setShowFilterAttributes(!showFilterAttributes)}
                    icon={<AttributeIcon />}
                  />
                )}
                {note.items?.emojis && (
                  <Subaction
                    title="Emojis"
                    selected={showFilterEmojis}
                    onClick={() => setShowFilterEmojis(!showFilterEmojis)}
                    icon={<EmojiIcon />}
                  />
                )}
              </Action>
            )}

            {layout === 'free' && (
              <Action title="Layer up" key="move-up" onClick={handleMoveUp} icon={<MoveUpIcon />} />
            )}
            {layout === 'free' && (
              <Action
                title="Layer down"
                key="move-down"
                onClick={handleMoveDown}
                icon={<MoveDownIcon />}
              />
            )}
            {note.attributes.hook && (
              <Action
                title="Run Hooks"
                key="run-hooks"
                onClick={handleRunHooks}
                icon={<RunHooksIcon />}
              />
            )}
            <Action
              title="Edit in external editor"
              key="edit"
              onClick={handleEdit}
              icon={<EditIcon />}
            />
          </Actions>
        </div>
      )}
      {showTitle && (
        <div className="RenderedNoteTitle">
          <NoteType value={note.type} />
          <Markdown md={note.shortTitle} inline />
        </div>
      )}
      {showBody && (
        <div className="RenderedNoteContent">
          {/* Default Mode */}
          {currentViewMode === 'default' && (
            <Markdown md={formatContent(note, ['preview'])} onWikilinkClick={handleWikilinkClick} />
          )}
          {/* List Mode */}
          {showActions && currentViewMode === 'list' && note.items?.children && (
            <div className="RenderedNoteItemsFilters">
              <input
                type="text"
                placeholder="Filter items"
                value={currentFilterText}
                onChange={(e) => setCurrentFilterText(e.target.value)}
              />
              {(showFilterAttributes || showFilterTags || showFilterEmojis) && (
                <ul className="Filter">
                  {showFilterTags &&
                    note.items.tags?.map((tag, index) => (
                      <li
                        key={`tag-${index}`}
                        className={currentFilterTags.includes(tag) ? 'selected' : ''}
                        onClick={() => handleToggleFilterTag(tag)}
                      >
                        #{tag}
                      </li>
                    ))}
                  {showFilterAttributes &&
                    note.items.attributes?.map((attribute, index) => (
                      <li
                        key={`attribute-${index}`}
                        className={currentFilterAttributes.includes(attribute) ? 'selected' : ''}
                        onClick={() => handleToggleFilterAttribute(attribute)}
                      >
                        @{attribute}
                      </li>
                    ))}
                  {showFilterEmojis &&
                    note.items.emojis?.map((emoji, index) => (
                      <li
                        key={`emoji-${index}`}
                        className={currentFilterEmojis.includes(emoji) ? 'selected' : ''}
                        onClick={() => handleToggleFilterEmoji(emoji)}
                      >
                        {emoji}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
          {currentViewMode === 'list' && note.items?.children && (
            <ul className="RenderedNoteItems">
              {filteredItems.map((item, index) => (
                <li key={index}>
                  <Markdown md={item.text} onWikilinkClick={handleWikilinkClick} inline />
                  {item.children && item.children.length > 0 && (
                    <ul>
                      {item.children.map((child, childIndex) => (
                        <li key={childIndex}>
                          <Markdown md={child.text} onWikilinkClick={handleWikilinkClick} inline />
                          <RenderedTags tags={child.tags || []} />
                          <RenderedAttributes
                            attributes={child.attributes || []}
                            repositoryConfig={repositoryConfig}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {metadataVisible && (
        <RenderedMetadata note={note} showTags={showTags} showAttributes={showAttributes} />
      )}
      {showComment && note.comment && (
        <div className="RenderedNoteComment">
          <Markdown md={note.comment} inline />
        </div>
      )}
    </div>
  )
}
