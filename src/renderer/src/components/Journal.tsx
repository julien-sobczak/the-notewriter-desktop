/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useContext } from 'react'
import {
  ArrowClockwiseIcon as RefreshIcon,
  FunnelIcon as FilterIcon,
  TagSimpleIcon as TagIcon,
  AtIcon as AttributeIcon,
  SmileyIcon as EmojiIcon,
  ArrowsVerticalIcon as ExpandIcon,
  ArrowElbowLeftDownIcon as UnexpandIcon
} from '@phosphor-icons/react'
import { ConfigContext, selectedJournals } from '@renderer/ConfigContext'
import { JournalConfigWithContext, Note, JournalActivity, ParentNote } from '@renderer/Model'
import Question from './Question'
import TimelineRangePicker from './TimelineRangePicker'
import RenderedNote from './RenderedNote'
import { Actions, Action, Subaction } from './Actions'
import Loader from './Loader'
import { formatDate } from '@renderer/helpers/dateUtils'

type ViewState = 'loading' | 'journal-selection' | 'viewing'

function Journal() {
  const { config } = useContext(ConfigContext)
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [journals, setJournals] = useState<JournalConfigWithContext[]>([])
  const [selectedJournal, setSelectedJournal] = useState<JournalConfigWithContext | null>(null)
  const [activity, setActivity] = useState<JournalActivity | null>(null)
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })
  const [notes, setNotes] = useState<ParentNote[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Filter state
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterAttributes, setFilterAttributes] = useState<string[]>([])
  const [filterEmojis, setFilterEmojis] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableAttributes, setAvailableAttributes] = useState<string[]>([])
  const [availableEmojis, setAvailableEmojis] = useState<string[]>([])
  const [showFilterTags, setShowFilterTags] = useState<boolean>(false)
  const [showFilterAttributes, setShowFilterAttributes] = useState<boolean>(false)
  const [showFilterEmojis, setShowFilterEmojis] = useState<boolean>(false)

  useEffect(() => {
    // Load journal configuration
    const loadJournals = () => {
      const allJournals = selectedJournals(config)
      setJournals(allJournals)

      if (allJournals.length === 0) {
        setViewState('loading')
      } else if (allJournals.length === 1) {
        // Only one journal, skip selection
        setSelectedJournal(allJournals[0])
        loadJournalActivity(allJournals[0])
      } else {
        setViewState('journal-selection')
      }
    }

    loadJournals()
  }, [config])

  const loadJournalActivity = async (journal: JournalConfigWithContext) => {
    if (!window.electron) return

    try {
      const pathPrefix = extractPathPrefix(journal.path)
      const journalActivity = await window.api.determineJournalActivity(
        journal.repositorySlug,
        pathPrefix
      )
      setActivity(journalActivity)

      // Set default date range (last 3 months)
      const today = new Date()
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(today.getMonth() - 3)

      const endDate = formatDate(today)
      const startDate = journalActivity.minDate
        ? formatDate(
            new Date(
              Math.max(threeMonthsAgo.getTime(), new Date(journalActivity.minDate).getTime())
            )
          )
        : formatDate(threeMonthsAgo)

      setDateRange({ start: startDate, end: endDate })
      setViewState('viewing')
    } catch (error) {
      console.error('Error loading journal activity:', error)
    }
  }

  const handleJournalSelected = (journal: JournalConfigWithContext) => {
    setSelectedJournal(journal)
    loadJournalActivity(journal)
  }

  const loadJournalEntries = async () => {
    if (!selectedJournal || !window.electron || !dateRange.start || !dateRange.end) {
      return
    }

    setIsLoading(true)
    try {
      const pathPrefix = extractPathPrefix(selectedJournal.path)
      const entries = await window.api.findJournalEntries(
        selectedJournal.repositorySlug,
        pathPrefix,
        dateRange.start,
        dateRange.end
      )

      console.info(
        `Loaded ${entries.length} journal entries from ${selectedJournal.repositorySlug} between ${dateRange.start} and ${dateRange.end}`
      )
      setNotes(entries)

      // Extract unique tags, attributes, and emojis
      extractFiltersFromNotes(entries)
    } catch (error) {
      console.error('Error loading journal entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const extractFiltersFromNotes = (noteList: Note[]) => {
    const tags = new Set<string>()
    const attributes = new Set<string>()
    const emojis = new Set<string>()

    noteList.forEach((note) => {
      // Extract tags
      if (!note.items || !note.items.children) {
        return
      }

      // The ListItem is a recursive datatype but we filter only top-level items to keep the implementation simple
      note.items.children.forEach((item) => {
        if (item.tags) {
          item.tags.forEach((tag: string) => tags.add(tag))
        }
        if (item.attributes) {
          item.attributes.forEach((attribute: string) => attributes.add(attribute))
        }
        if (item.emojis) {
          item.emojis.forEach((emoji: string) => emojis.add(emoji))
        }
      })
    })

    setAvailableTags(Array.from(tags).sort())
    setAvailableAttributes(Array.from(attributes).sort())
    setAvailableEmojis(Array.from(emojis).sort())
  }

  useEffect(() => {
    if (viewState === 'viewing' && dateRange.start && dateRange.end) {
      loadJournalEntries()
    }
  }, [viewState, dateRange])

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end })
  }

  const handleRefresh = () => {
    loadJournalEntries()
  }

  const handleToggleFilterTag = (tag: string) => {
    setFilterTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleToggleFilterAttribute = (attribute: string) => {
    setFilterAttributes((prev) =>
      prev.includes(attribute) ? prev.filter((a) => a !== attribute) : [...prev, attribute]
    )
  }

  const handleToggleFilterEmoji = (emoji: string) => {
    setFilterEmojis((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji]
    )
  }

  // Add helper to determine if a note has any top-level items matching the active filters.
  const noteHasMatchingItems = (note: Note): boolean => {
    // If no filters are active, include the note
    if (filterTags.length === 0 && filterAttributes.length === 0 && filterEmojis.length === 0) {
      return true
    }

    if (!note.items || !note.items.children || note.items.children.length === 0) {
      // Note has no top-level items -> doesn't match when any filter is active
      return false
    }

    // Helper to test intersection
    const intersects = (arr: string[] | undefined, filters: string[]) =>
      !!arr && arr.some((v) => filters.includes(v))

    // For each top-level item, check whether it satisfies all active filter types.
    return note.items.children.some((item) => {
      // For each filter type that is active, the item must have at least one of those values.
      if (filterTags.length > 0 && !intersects(item.tags, filterTags)) {
        return false
      }
      if (
        filterAttributes.length > 0 &&
        !intersects(Object.keys(item.attributes), filterAttributes)
      ) {
        return false
      }
      if (filterEmojis.length > 0 && !intersects(item.emojis, filterEmojis)) {
        return false
      }
      // Passed all active filter checks
      return true
    })
  }

  if (viewState === 'loading') {
    return (
      <div className="Journal Screen">
        <Loader />
      </div>
    )
  }

  if (viewState === 'journal-selection') {
    return (
      <div className="Journal Screen">
        <Question
          question="Which journal would you like to view?"
          choices={journals}
          renderChoice={(journal) => <span>{journal.name}</span>}
          onChoiceSelected={handleJournalSelected}
        />
      </div>
    )
  }

  if (viewState === 'viewing' && selectedJournal && activity) {
    return (
      <div className="Journal Screen">
        {/* Timeline Range Picker */}
        <TimelineRangePicker
          min={activity.minDate || '2020-01-01'}
          max={formatDate(new Date())}
          start={dateRange.start}
          end={dateRange.end}
          onChange={handleDateRangeChange}
        />

        {/* Actions */}
        <Actions>
          <Action icon={<RefreshIcon />} title="Refresh" onClick={handleRefresh} />
          <Action icon={<FilterIcon />} title="Filter items">
            <Subaction
              icon={<TagIcon />}
              title="Tags"
              selected={showFilterTags}
              onClick={() => setShowFilterTags(!showFilterTags)}
            />
            <Subaction
              icon={<AttributeIcon />}
              title="Attributes"
              selected={showFilterAttributes}
              onClick={() => setShowFilterAttributes(!showFilterAttributes)}
            />
            <Subaction
              icon={<EmojiIcon />}
              title="Emojis"
              selected={showFilterEmojis}
              onClick={() => setShowFilterEmojis(!showFilterEmojis)}
            />
          </Action>
        </Actions>

        {/* Filter selections */}
        {(showFilterTags || showFilterAttributes || showFilterEmojis) && (
          <div className="FilterSelections">
            <ul className="Filter">
              {showFilterTags &&
                availableTags.map((tag) => (
                  <li
                    key={tag}
                    className={filterTags.includes(tag) ? 'selected' : ''}
                    onClick={() => handleToggleFilterTag(tag)}
                  >
                    #{tag}
                  </li>
                ))}
              {showFilterAttributes &&
                availableAttributes.map((attr) => (
                  <li
                    key={attr}
                    className={filterAttributes.includes(attr) ? 'selected' : ''}
                    onClick={() => handleToggleFilterAttribute(attr)}
                  >
                    @{attr}
                  </li>
                ))}
              {showFilterEmojis &&
                availableEmojis.map((emoji) => (
                  <li
                    key={emoji}
                    className={filterEmojis.includes(emoji) ? 'selected' : ''}
                    onClick={() => handleToggleFilterEmoji(emoji)}
                  >
                    {emoji}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && <Loader />}

        {/* Journal entries */}
        {!isLoading && (
          <>
            <div className="JournalEntries">
              {notes
                .filter((note) => noteHasMatchingItems(note.parent))
                .map((note) => {
                  return (
                    <JournalEntry
                      key={note.parent.oid}
                      note={note as ParentNote}
                      filterTags={filterTags}
                      filterAttributes={filterAttributes}
                      filterEmojis={filterEmojis}
                    />
                  )
                })}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="Journal Screen">
      <Loader />
    </div>
  )
}

type JournalEntryProps = {
  note?: ParentNote
  filterTags?: string[]
  filterAttributes?: string[]
  filterEmojis?: string[]
}

function JournalEntry({ note, filterTags, filterAttributes, filterEmojis }: JournalEntryProps) {
  const [selectedDailyNote, setSelectedDailyNote] = useState<Note | null>(null)

  const entryNote = note?.parent
  const dailyNotes = note?.children || []

  const today = formatDate(new Date())
  const isToday = entryNote?.attributes.date === today

  const showDailyNotes = dailyNotes.length > 0

  const handleDailyNoteSelected = (dailyNote: Note) => {
    if (selectedDailyNote?.oid === dailyNote.oid) {
      // Deselect if already selected
      setSelectedDailyNote(null)
      return
    }
    setSelectedDailyNote(dailyNote)
  }

  return (
    // Check if today's note exists
    <div key={entryNote ? entryNote.oid : 'daily-note'} className="JournalEntry">
      <h3 className="JournalDate">
        {isToday ? 'Today' : entryNote?.attributes.date || 'Unknown Date'}
      </h3>
      {entryNote && (
        <RenderedNote
          note={entryNote}
          viewMode="list"
          showTitle={false}
          showActions={false}
          showTags={false}
          showAttributes={false}
          showComment={false}
          filterTags={filterTags}
          filterAttributes={filterAttributes}
          filterEmojis={filterEmojis}
        />
      )}
      {showDailyNotes && (
        <div className="JournalDailyNotes">
          {dailyNotes.map((dailyNote: Note) => (
            <button
              key={dailyNote.oid}
              type="button"
              onClick={() => handleDailyNoteSelected(dailyNote)}
            >
              {selectedDailyNote?.oid === dailyNote.oid && <UnexpandIcon size={16} />}
              {selectedDailyNote?.oid !== dailyNote.oid && <ExpandIcon size={16} />}
              &nbsp;{dailyNote.shortTitle}
            </button>
          ))}
        </div>
      )}
      {selectedDailyNote && (
        <div className="JournalSelectedDailyNote">
          <RenderedNote
            note={selectedDailyNote}
            showTitle={false}
            showActions={false}
            showTags={false}
            showAttributes={false}
            showComment={false}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Extract the path prefix from a journal path template.
 * Returns the longest prefix without placeholders (${...}).
 * For example: 'journal/${year}/${year}-${month}-${day}.md' returns 'journal/'
 */
function extractPathPrefix(pathTemplate: string): string {
  // Find the first occurrence of ${
  const placeholderIndex = pathTemplate.indexOf('${')
  if (placeholderIndex === -1) {
    // No placeholders, return the whole path
    return pathTemplate
  }
  // Return everything before the first placeholder
  return pathTemplate.substring(0, placeholderIndex)
}

export default Journal
