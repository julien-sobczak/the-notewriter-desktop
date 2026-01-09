import React, { useState, useEffect, useRef, useContext } from 'react'
import { generateOid, generateOidFromString } from '@renderer/helpers/oid'
import {
  HandWavingIcon as HiIcon,
  FileSearchIcon as BrowserIcon,
  DesktopIcon,
  NotebookIcon as JournalIcon,
  BrainIcon as StudyIcon,
  KanbanIcon as TasksIcon,
  LightbulbIcon as InspirationIcon,
  FlowerLotusIcon as ZenIcon,
  ChartBarIcon as StatsIcon,
  XIcon as CloseIcon,
  CornersOutIcon as ExpandIcon,
  Icon,
  StarIcon as BookmarkerIcon,
  XCircleIcon as CancelIcon,
  CheckCircleIcon as OpenIcon,
  PlusIcon
} from '@phosphor-icons/react'
import classNames from 'classnames'
import { Command } from 'cmdk'
import {
  Desk,
  Query,
  QueryResult,
  RepositoryRefConfig,
  DeckRef,
  Bookmark,
  File,
  TabRef,
  FileTab,
  NotesTab,
  DeskTab,
  Goto,
  FileRef
} from '@renderer/Model'
import Hi from './Hi'
import Bookmarker from './Bookmarker'
import Planner from './Planner'
import Stats from './Stats'
import Inspiration from './Inspiration'
import Decks from './Decks'
import ZenMode from './ZenMode'
import NoteContainer from './NoteContainer'
import RenderedFileTab from './RenderedFileTab'
import RenderedNotesTab from './RenderedNotesTab'
import RenderedDeskTab from './RenderedDeskTab'
import Journal from './Journal'
import NoteType from './NoteType'
import Markdown from './Markdown'
import NotificationsStatus from './Notifications'
import { ConfigContext } from '@renderer/ConfigContext'
import BrowserSidebar from './BrowserSidebar'
import DesktopSidebar from './DesktopSidebar'
import Welcome from './Welcome'

const gotoRegex = /\$\{([a-zA-Z0-9_]+)(?::\[((?:[^\]]+))\])?\}/g

type GotoPlaceholderProps = {
  name: string
  values?: string[]
  value: string
  onChange: (name: string, value: string) => void
  inputRef?: React.Ref<any>
}

// Placeholder for Goto variables.
// If a predefined list of options is provided, use a <select> element, otherwise use an <input>.
//
// Ex (no options):
//   ${name}
//   => <input type="text" placeholder="name" />
//
// Ex (predefined options):
//   ${name:[Alice,Bob,Charlie]}
//   => <select><option>Alice</option><option>Bob</option><option>Charlie</option></select>
//
// Ex (example options):
//   ${name:[Alice,Bob,...]}
//   => <input type="text" placeholder="Alice,Bob,..."/>
function GotoPlaceholder({
  name,
  values,
  value,
  onChange,
  // Use a ref to focus the first input/select in parent form
  inputRef
}: GotoPlaceholderProps) {
  return (
    <span className="GotoPlaceholder">
      <div className="GotoPlaceholderName">{name}</div>
      {values && values.length > 0 && !values.includes('...') ? (
        <select
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          required
        >
          <option value="" disabled>
            {name}
          </option>
          {values.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={values ? values.join(',') : name}
          required
        />
      )}
    </span>
  )
}

type GotoFormProps = {
  url: string
  onSubmit: (evaluatedUrl: string) => void
  onCancel: () => void
}

// Form to evaluate a Goto URL containing variable placeholders
function GotoForm({ url, onSubmit, onCancel }: GotoFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})

  // Keep a ref to the first form element to focus
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  // Split the URL into parts: text and variable placeholders
  type Part =
    | { type: 'text'; value: string }
    | { type: 'placeholder'; name: string; values?: string[] }

  const parts: Part[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  gotoRegex.lastIndex = 0
  while ((match = gotoRegex.exec(url)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: url.slice(lastIndex, match.index) })
    }
    const name = match[1]
    const optionsRaw = match[2]
    let options: string[] | undefined
    if (optionsRaw) {
      options = optionsRaw.split(',').map((s) => s.trim())
    }
    parts.push({ type: 'placeholder', name, values: options })
    lastIndex = gotoRegex.lastIndex
  }
  if (lastIndex < url.length) {
    parts.push({ type: 'text', value: url.slice(lastIndex) })
  }

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let evaluatedUrl = ''
    for (const part of parts) {
      if (part.type === 'text') {
        evaluatedUrl += part.value
      } else if (part.type === 'placeholder') {
        evaluatedUrl += values[part.name] || ''
      }
    }
    onSubmit(evaluatedUrl)
  }

  // Cancel on ESC key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  // Focus the first placeholder
  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  let firstPlaceholderRendered = false

  return (
    <div className="GotoForm">
      <form onSubmit={handleSubmit}>
        <div className="GotoFormURL">
          {parts.map((part, idx) => {
            if (part.type === 'text') {
              return <span key={idx}>{part.value}</span>
            }
            if (part.type === 'placeholder') {
              const ref = !firstPlaceholderRendered ? firstInputRef : undefined
              firstPlaceholderRendered = true
              return (
                <GotoPlaceholder
                  key={part.name + idx}
                  name={part.name}
                  values={part.values}
                  value={values[part.name] || ''}
                  onChange={handleChange}
                  inputRef={ref}
                />
              )
            }
            return null
          })}
          <button type="submit">
            <OpenIcon size={32} />
          </button>
          <button type="button" onClick={onCancel}>
            <CancelIcon size={32} />
          </button>
        </div>
      </form>
    </div>
  )
}

type CommandMenuProps = {
  repositories: RepositoryRefConfig[]
  desks: Desk[] | null | undefined
  decks: DeckRef[] | null | undefined
  bookmarks: Bookmark[] | null | undefined
  files: File[] | null | undefined
  onActivitySelected?: (activity: string) => void
  onRepositoryToggled?: (repository: RepositoryRefConfig) => void
  onDeskSelected?: (desk: Desk) => void
  onDeckSelected?: (desk: DeckRef) => void
  onBookmarkSelected?: (bookmark: Bookmark) => void
  onFileSelected?: (file: File) => void
}

function CommandMenu({
  repositories,
  desks,
  decks,
  bookmarks,
  files,
  onActivitySelected = () => {},
  onRepositoryToggled = () => {},
  onDeskSelected = () => {},
  onDeckSelected = () => {},
  onBookmarkSelected = () => {},
  onFileSelected = () => {}
}: CommandMenuProps) {
  const { config } = useContext(ConfigContext)
  const editorConfig = config.config

  /*
   * Implementation based on project https://cmdk.paco.me/ (https://github.com/pacocoursey/cmdk)
   * Examples are available in GitHub. The linear style was used as the baseline:
   * - TypeScript: https://github.com/pacocoursey/cmdk/blob/main/website/components/cmdk/linear.tsx
   * - CSS: https://github.com/pacocoursey/cmdk/blob/main/website/styles/cmdk/linear.scss
   */
  const [open, setOpen] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')
  const [gotos, setGotos] = useState<Goto[]>([])
  const [gotoFormURL, setGotoFormURL] = useState<string | null>(null)
  const [pages, setPages] = useState<string[]>([])
  const page = pages[pages.length - 1]

  useEffect(() => {
    // Retrieve the statistics based on currently selected repositories
    const selectedRepositorySlugs = editorConfig.repositories
      .filter((repository: RepositoryRefConfig) => repository.selected)
      .map((repository: RepositoryRefConfig) => repository.slug)

    const listGotos = async () => {
      const results = await window.api.listGotos(selectedRepositorySlugs)
      setGotos(results)
    }

    listGotos()
  }, [editorConfig.repositories])

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: any) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((isCurrentlyOpen) => !isCurrentlyOpen)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const closeMenu = () => {
    setOpen(false)
    setSearch('')
    setPages([])
  }

  const handleActivitySelected = (activitySlug: string) => {
    onActivitySelected(activitySlug)
    closeMenu()
  }

  const handleRepositoryToggled = (repository: RepositoryRefConfig) => {
    onRepositoryToggled(repository)
    closeMenu()
  }

  const handleDeskSelected = (desk: Desk) => {
    onDeskSelected(desk)
    closeMenu()
    onActivitySelected('desktop')
  }

  const handleDeckSelected = (deck: DeckRef) => {
    onDeckSelected(deck)
    closeMenu()
    onActivitySelected('decks')
  }

  const handleBookmarkSelected = (bookmark: Bookmark) => {
    onBookmarkSelected(bookmark)
    closeMenu()
    onActivitySelected('bookmarker')
  }

  const handleFileSelected = (file: File) => {
    onFileSelected(file)
    closeMenu()
    onActivitySelected('browser')
  }

  const handleGotoSelected = (goto: Goto) => {
    gotoRegex.lastIndex = 0
    if (gotoRegex.test(goto.url)) {
      closeMenu()
      setGotoFormURL(goto.url)
    } else {
      window.api.browseUrl(goto.url)
      closeMenu()
    }
  }

  const handleGotoFormSubmit = (evaluatedUrl: string) => {
    window.api.browseUrl(evaluatedUrl)
    setGotoFormURL(null)
    closeMenu()
  }

  return (
    <>
      <Command.Dialog
        className="CmdK"
        open={open}
        onOpenChange={setOpen}
        label="Global Command Menu"
        onKeyDown={(e) => {
          // Escape goes to previous page
          // Backspace goes to previous page when search is empty
          if (e.key === 'Escape' || (e.key === 'Backspace' && !search)) {
            e.preventDefault()
            setPages((currentPages) => currentPages.slice(0, -1))
          }
        }}
      >
        <Command.Input
          value={search}
          onValueChange={setSearch}
          autoFocus
          placeholder="Type a command or search..."
        />
        <Command.List>
          <Command.Empty>No results found.</Command.Empty>

          <Command.Group heading="Commands">
            {!page && (
              <Command.Item onSelect={() => handleActivitySelected('hi')}>Hello</Command.Item>
            )}
            {!page && (
              <Command.Item onSelect={() => handleActivitySelected('hi')}>Bye</Command.Item>
            )}
            <Command.Separator />

            {!page && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'gotos'])
                  setSearch('')
                }}
              >
                Goto...
              </Command.Item>
            )}
            {page === 'gotos' && (
              <>
                {gotos.map((goto: Goto) => (
                  <Command.Item
                    key={goto.oid}
                    value={goto.name}
                    onSelect={() => handleGotoSelected(goto)}
                  >
                    Goto <code>{goto.name}</code>
                  </Command.Item>
                ))}
              </>
            )}

            {!page && repositories.length > 1 && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'repositories'])
                  setSearch('')
                }}
              >
                Toggle repository...
              </Command.Item>
            )}
            {page === 'repositories' && (
              <>
                {repositories.map((repository: RepositoryRefConfig) => (
                  <Command.Item
                    key={repository.slug}
                    value={repository.name}
                    onSelect={() => handleRepositoryToggled(repository)}
                  >
                    Toggle repository <em>{repository.name}</em>
                  </Command.Item>
                ))}
              </>
            )}

            <Command.Separator />

            {!page && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'files'])
                  setSearch('')
                }}
              >
                Open file...
              </Command.Item>
            )}
            {/* Show results after a few characters */}
            {page === 'files' && files && search && search.length > 3 && (
              <>
                {files.map((file: File) => {
                  // Filter files
                  if (!file.relativePath.includes(search)) return null
                  return (
                    <Command.Item
                      key={file.oid}
                      value={file.relativePath}
                      onSelect={() => handleFileSelected(file)}
                    >
                      Open file&nbsp;
                      <em>
                        <code>{file.relativePath}</code>
                      </em>
                    </Command.Item>
                  )
                })}
              </>
            )}

            {!page && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'desks'])
                  setSearch('')
                }}
              >
                Open desk...
              </Command.Item>
            )}
            {page === 'desks' && desks && (
              <>
                {desks.map((desk: Desk) => (
                  <Command.Item
                    key={desk.oid}
                    value={desk.name}
                    onSelect={() => handleDeskSelected(desk)}
                  >
                    Open desk <em>{desk.name}</em>
                  </Command.Item>
                ))}
              </>
            )}

            <Command.Separator />

            {!page && (
              <Command.Item onSelect={() => handleActivitySelected('decks')}>Study</Command.Item>
            )}
            {!page && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'decks'])
                  setSearch('')
                }}
              >
                Study deck...
              </Command.Item>
            )}
            {page === 'decks' && decks && (
              <>
                {decks.map((deck: DeckRef) => (
                  <Command.Item
                    key={deck.name}
                    value={deck.name}
                    onSelect={() => handleDeckSelected(deck)}
                  >
                    Study deck <em>{deck.name}</em>
                  </Command.Item>
                ))}
              </>
            )}

            <Command.Separator />

            {!page && (
              <Command.Item onSelect={() => handleActivitySelected('zen')}>
                Launch Zen Mode
              </Command.Item>
            )}

            <Command.Separator />

            {!page && (
              <Command.Item onSelect={() => handleActivitySelected('stats')}>
                Show statistics
              </Command.Item>
            )}
          </Command.Group>
          {!page && bookmarks && (
            <Command.Group heading="Bookmarks">
              {bookmarks.map((savedBookmark: Bookmark) => (
                <Command.Item
                  key={savedBookmark.noteOID}
                  onSelect={() => handleBookmarkSelected(savedBookmark)}
                >
                  <NoteType value={savedBookmark.noteType} />
                  &nbsp;
                  <span className="BookmarkTitle">
                    <Markdown md={savedBookmark.noteLongTitle} inline />
                  </span>
                  <span className="CommandItemMeta">
                    <code>{savedBookmark.noteRelativePath}</code>
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command.Dialog>
      {gotoFormURL && (
        <GotoForm
          url={gotoFormURL}
          onSubmit={handleGotoFormSubmit}
          onCancel={() => setGotoFormURL(null)}
        />
      )}
    </>
  )
}

export interface Activity {
  // Static description
  slug: string
  // Human-readable description
  name: string
  icon: Icon
}

function Main() {
  const { config, dispatch } = useContext(ConfigContext)

  const editorConfig = config.config
  const repositoryConfigs = config.repositories
  const deckRefs = Object.keys(repositoryConfigs || {})
    .map((repositorySlug: string): DeckRef[] => {
      const repositoryConfig = repositoryConfigs[repositorySlug]
      const results: DeckRef[] = []
      if (repositoryConfig.decks) {
        for (const deck of repositoryConfig.decks) {
          results.push({
            repositorySlug,
            name: deck.name
          })
        }
      }
      return results
    })
    .flat()

  // Global search
  const inputElement = useRef<HTMLInputElement>(null)
  const [inputQuery, setInputQuery] = useState<string>('') // current input value
  const [searchQuery, setSearchQuery] = useState<string>('') // last search value
  const [searchResults, setSearchResults] = useState<QueryResult | null>(null) // last search value results
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false) // display the aside panel with search results
  const [expandSearchResults, setExpandSearchResults] = useState<boolean>(false) // display the search panel in large

  // Activities
  const [activity, setActivity] = useState<string>('desktop')
  const previousActivity = useRef<string>('desktop')
  // Use this method to memorize the last activity (useful for example to come back when you left after the zen mode)
  const switchActivity = (newActivity: string) => {
    previousActivity.current = activity
    setActivity(newActivity)
  }

  // Files
  const [files, setFiles] = useState<File[]>([])

  // Tabs - Initialize from dynamic config
  const [openedTabs, setOpenedTabs] = useState<TabRef[]>(editorConfig.tabs || [])
  const [activeTabIndex, setActiveTabIndex] = useState<number>(
    editorConfig.tabs && editorConfig.tabs.length > 0 ? 0 : -1
  )

  // Function to add a new tab
  const addTab = (
    kind: 'file' | 'notes' | 'desk',
    title: string,
    data: FileTab | NotesTab | DeskTab
  ) => {
    const newTab: TabRef = {
      kind,
      title,
      data,
      stale: false
    }
    const newTabs = [...openedTabs, newTab]
    setOpenedTabs(newTabs)
    setActiveTabIndex(newTabs.length - 1) // Set the new tab as active
    // Dispatch to save tabs to config
    dispatch({
      type: 'updateTabs',
      payload: newTabs
    })
  }

  // Selection
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>()
  const [selectedDeck, setSelectedDeck] = useState<DeckRef | undefined>()

  useEffect(() => {
    // Load all files to provide them in cmd+k
    const repositorySlugs: string[] = editorConfig.repositories.map(
      (w: RepositoryRefConfig) => w.slug
    )

    const listFiles = async () => {
      const results: File[] = await window.api.listFiles(
        repositorySlugs[0] // FIXME use all repositories?
      )
      setFiles(results)
    }
    listFiles()
  }, [editorConfig.repositories])

  useEffect(() => {
    // Update opened tabs when editorConfig.tabs changes
    if (!editorConfig.tabs) return
    setOpenedTabs(editorConfig.tabs)
    if (activeTabIndex === -1) setActiveTabIndex(0) // Force the first tab by default
  }, [editorConfig.tabs]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (event: any) => {
    if (inputQuery === searchQuery) {
      // Query hasn't changed but results could have been collapsed
      setShowSearchResults(true)
    } else {
      // Trigger a new search
      setSearchQuery(inputQuery)
    }
    event.preventDefault()
  }

  const selectedRepositorySlugs = editorConfig.repositories
    .filter((repository: RepositoryRefConfig) => repository.selected)
    .map((repository: RepositoryRefConfig) => repository.slug)

  useEffect(() => {
    if (searchQuery.trim() === '') {
      return
    }
    console.debug(`Searching ${searchQuery}...`)
    const query: Query = {
      query: searchQuery,
      repositories: selectedRepositorySlugs,
      blockOid: null,
      deskOid: null,
      limit: 0,
      shuffle: false
    }

    const search = async () => {
      const result: QueryResult = await window.api.search(query)
      console.debug(`Found ${result.notes.length} results for ${result.query.query}`)
      if (!result.query.blockOid) {
        // global search
        setSearchResults(result)
        setShowSearchResults(true)
      }
    }
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  useEffect(() => {
    inputElement.current?.focus()
  })

  const handleRepositoryToggle = (slug: string) => {
    dispatch({
      type: 'toggleRepositorySelected',
      payload: slug
    })
  }

  const handleDeskSelected = async (desk: Desk) => {
    // Search in already opened desks to not open duplicates
    let found = false
    let foundIndex = -1
    for (const tab of openedTabs) {
      if (tab.kind !== 'desk') continue
      const openedDesk = tab.data as DeskTab
      if (openedDesk.oid === desk.oid) {
        found = true
        foundIndex = openedTabs.indexOf(tab)
      }
    }

    if (found) {
      setActiveTabIndex(foundIndex)
      return
    }

    const deskTab: DeskTab = {
      // Ensure we have an oid for tab to correctly identify the right desk to render
      oid: desk.oid ? desk.oid : await generateOidFromString(desk.name)
    }
    addTab('desk', desk.name, deskTab)
  }

  const handleDeckSelected = (deck: DeckRef) => {
    setSelectedDeck(deck)
  }

  const handleBookmarkSelected = (bookmark: Bookmark) => {
    setSelectedBookmark(bookmark)
  }

  // Called when the user selects a file from the Cmd+K menu
  const handleFileSelected = (file: File) => {
    // Search in already opened desks to not open duplicates
    let found = false
    let foundIndex = -1
    for (const tab of openedTabs) {
      if (tab.kind !== 'file') continue
      const openedFile = tab.data as FileTab
      if (openedFile.file.oid === file.oid) {
        found = true
        foundIndex = openedTabs.indexOf(tab)
      }
    }

    if (found) {
      setActiveTabIndex(foundIndex)
      return
    }

    // Get the filename from the relative path - path.basename equivalent
    const pathParts = file.relativePath.split('/')
    const filename = pathParts[pathParts.length - 1] || file.relativePath
    const fileTab: FileTab = {
      file: { oid: file.oid, repositorySlug: file.repositorySlug },
      relativePath: file.relativePath
    }
    addTab('file', filename, fileTab)
  }

  // Called when the user selects a file from the file explorer
  const handleFileRefSelected = (file: FileRef) => {
    // Get the filename from the relative path - path.basename equivalent
    if (!file.relativePath) return
    const pathParts = file.relativePath.split('/')
    const filename = pathParts[pathParts.length - 1] || file.relativePath
    const fileTab: FileTab = {
      file,
      relativePath: file.relativePath
    }
    addTab('file', filename, fileTab)
  }

  const handleZenModeClose = () => {
    if (previousActivity.current) {
      setActivity(previousActivity.current)
    } else {
      switchActivity('hi')
    }
  }

  const handleTabClick = (index: number) => {
    setActiveTabIndex(index)
  }

  const handleTabClose = (index: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent tab selection when closing
    const newTabs = openedTabs.filter((_, i) => i !== index)
    setOpenedTabs(newTabs)

    // Dispatch to save tabs to config
    dispatch({
      type: 'updateTabs',
      payload: newTabs
    })

    // Update active tab index
    if (activeTabIndex === index) {
      // If closing the active tab, switch to the previous tab
      setActiveTabIndex(Math.max(0, index - 1))
    } else if (activeTabIndex > index) {
      // If closing a tab before the active one, adjust the index
      setActiveTabIndex(activeTabIndex - 1)
    }

    // If no tabs left, reset to -1
    if (newTabs.length === 0) {
      setActiveTabIndex(-1)
    }
  }

  const handleNewDeskTab = () => {
    const newDeskId = generateOid()
    const deskTab: DeskTab = { oid: newDeskId }
    addTab('desk', 'New Desk', deskTab)
  }

  const handleAddRepository = async () => {
    const repositoryPath = await window.api.selectDirectory()
    if (!repositoryPath) return

    // Check if .nt/config.jsonnet exists
    const fs = await import('fs')
    const path = await import('path')
    const configPath = path.default.join(repositoryPath, '.nt', 'config.jsonnet')
    
    // For now, we'll dispatch the add-repository action
    // In a real implementation, you'd want to validate the path on the main process
    const repositoryName = path.default.basename(repositoryPath)
    const repositorySlug = repositoryName.toLowerCase().replace(/\s+/g, '-')
    
    dispatch({
      type: 'add-repository',
      payload: {
        name: repositoryName,
        slug: repositorySlug,
        path: repositoryPath,
        selected: true
      }
    })
  }

  const handleRepositorySelected = (repositoryPath: string) => {
    // Add the repository to the config
    const repositoryName = repositoryPath.split('/').pop() || 'Repository'
    const repositorySlug = repositoryName.toLowerCase().replace(/\s+/g, '-')
    
    dispatch({
      type: 'add-repository',
      payload: {
        name: repositoryName,
        slug: repositorySlug,
        path: repositoryPath,
        selected: true
      }
    })
  }

  // Check if there are no repositories
  const hasNoRepositories = editorConfig.repositories.length === 0

  if (hasNoRepositories) {
    return <Welcome onRepositorySelected={handleRepositorySelected} />
  }

  const activities: Activity[] = [
    {
      slug: 'hi',
      name: 'Hi',
      icon: HiIcon
    },
    {
      slug: 'bookmarker',
      name: 'Bookmarker',
      icon: BookmarkerIcon
    },
    {
      slug: 'browser',
      name: 'Browser',
      icon: BrowserIcon
    },
    {
      slug: 'desktop',
      name: 'Desktop',
      icon: DesktopIcon
    },
    {
      slug: 'journal',
      name: 'Journal',
      icon: JournalIcon
    },
    {
      slug: 'decks',
      name: 'Study',
      icon: StudyIcon
    },
    {
      slug: 'tasks',
      name: 'Tasks',
      icon: TasksIcon
    },
    {
      slug: 'inspiration',
      name: 'Inspiration',
      icon: InspirationIcon
    },
    {
      slug: 'zen',
      name: 'Zen Mode',
      icon: ZenIcon
    },
    {
      slug: 'stats',
      name: 'Statistics',
      icon: StatsIcon
    }
  ]

  return (
    <div
      className={classNames({
        Main,
        ZenModeEnabled: activity === 'zen'
      })}
    >
      {/* Search bar */}
      <header className="TopBar">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            ref={inputElement}
            placeholder="🔍 Search"
            name="search"
            value={inputQuery}
            onChange={(event: any) => setInputQuery(event.target.value)}
          />
        </form>
        <nav className="RepositoryButtonGroup">
          {editorConfig.repositories.length > 1 &&
            editorConfig.repositories.map((repository: RepositoryRefConfig) => (
              <button
                type="button"
                key={repository.name}
                className={classNames({ selected: repository.selected })}
                onClick={() => handleRepositoryToggle(repository.slug)}
              >
                {repository.name}
              </button>
            ))}
          <button
            type="button"
            className="AddRepositoryButton"
            onClick={handleAddRepository}
            title="Add repository"
          >
            <PlusIcon size={16} />
          </button>
        </nav>
        <NotificationsStatus />
      </header>

      <CommandMenu
        // Data
        repositories={editorConfig.repositories}
        desks={editorConfig.desks}
        decks={deckRefs}
        bookmarks={editorConfig.bookmarks}
        files={files}
        // Events
        onActivitySelected={(activitySlug) => switchActivity(activitySlug)}
        onRepositoryToggled={(repository) => handleRepositoryToggle(repository.slug)}
        onDeskSelected={handleDeskSelected}
        onDeckSelected={handleDeckSelected}
        onBookmarkSelected={handleBookmarkSelected}
        onFileSelected={handleFileSelected}
      />

      <div className="MainMenu">
        <div className="ActivityBar">
          <ul>
            {activities.map((currentActivity) => (
              <li
                key={currentActivity.slug}
                className={classNames({
                  selected: activity === currentActivity.slug
                })}
              >
                <button
                  type="button"
                  onClick={() => switchActivity(currentActivity.slug)}
                  title={currentActivity.name}
                  aria-label={currentActivity.name}
                >
                  <currentActivity.icon
                    weight={activity === currentActivity.slug ? 'light' : 'thin'}
                    size={24}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {activity === 'browser' && (
          <div className="ActivitySidebar">
            <BrowserSidebar
              onFileSelected={handleFileRefSelected}
              onClose={() => setActivity('')}
            />
          </div>
        )}

        {activity === 'desktop' && (
          <div className="ActivitySidebar">
            <DesktopSidebar onDeskSelected={handleDeskSelected} onClose={() => setActivity('')} />
          </div>
        )}

        {showSearchResults && (
          <div
            className={classNames({
              SearchPanel: true,
              expanded: expandSearchResults
            })}
          >
            <button
              className="top-left"
              type="button"
              onClick={() => setExpandSearchResults(!expandSearchResults)}
              title="Expand search panel"
            >
              <ExpandIcon />
            </button>
            <NoteContainer
              notes={searchResults?.notes}
              layout="list"
              layoutSelectable={false}
              onClose={() => setShowSearchResults(false)}
            />
          </div>
        )}

        {openedTabs.length > 0 && (
          <div
            className={classNames({
              EditorArea: true,
              focused: ['', 'browser', 'desktop'].includes(activity)
            })}
          >
            {openedTabs.length > 0 && (
              <div className="TabBar">
                <nav>
                  <ul>
                    {openedTabs.map((tab, index) => (
                      <li
                        key={index}
                        className={classNames({
                          selected: index === activeTabIndex,
                          stale: tab.stale
                        })}
                        onClick={() => handleTabClick(index)}
                      >
                        <span className="TabTitle">{tab.title}</span>
                        <button
                          type="button"
                          className="TabCloseButton"
                          onClick={(e) => handleTabClose(index, e)}
                          title="Close tab"
                        >
                          <CloseIcon size={12} />
                        </button>
                      </li>
                    ))}
                    <li className="TabAddButton" onClick={handleNewDeskTab}>
                      <button type="button" title="New Desk">
                        <PlusIcon size={16} />
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}

            {openedTabs.map((tab, index) => (
              <div
                key={index}
                className={classNames({ selected: index === activeTabIndex, TabContent: true })}
              >
                {(() => {
                  if (tab.kind === 'file') {
                    const fileData = tab.data as FileTab
                    return <RenderedFileTab title={tab.title} {...fileData} />
                  } else if (tab.kind === 'notes') {
                    const notesData = tab.data as NotesTab
                    return <RenderedNotesTab title={tab.title} {...notesData} />
                  } else if (tab.kind === 'desk') {
                    const deskData = tab.data as DeskTab
                    return <RenderedDeskTab title={tab.title} {...deskData} />
                  }
                  return null
                })()}
              </div>
            ))}
          </div>
        )}

        {/* Hi */}
        {activity === 'hi' && <Hi />}

        {/* Bookmarks */}
        {activity === 'bookmarker' && <Bookmarker bookmark={selectedBookmark} />}

        {/* Journal */}
        {activity === 'journal' && <Journal />}

        {/* Study */}
        {activity === 'decks' && <Decks deck={selectedDeck} />}

        {/* Tasks */}
        {activity === 'tasks' && <Planner />}

        {/* Inspiration */}
        {activity === 'inspiration' && <Inspiration />}

        {/* Zen */}
        {activity === 'zen' && <ZenMode onClose={handleZenModeClose} />}

        {/* Stats */}
        {activity === 'stats' && <Stats />}
      </div>
    </div>
  )
}

export default Main
