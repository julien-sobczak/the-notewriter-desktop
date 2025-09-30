/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useContext } from 'react';
import {
  ArrowClockwise as RefreshIcon,
  Funnel as FilterIcon,
  TagSimple as TagIcon,
  At as AttributeIcon,
  Smiley as EmojiIcon,
} from '@phosphor-icons/react';
import { ConfigContext } from './ConfigContext';
import {
  JournalConfig,
  Note,
  RoutineConfig,
  JournalActivity,
} from '../shared/Model';
import Question from './Question';
import TimelineRangePicker from './TimelineRangePicker';
import RenderedNote from './RenderedNote';
import RenderedRoutine from './RenderedRoutine';
import { Actions, Action, Subaction } from './Actions';
import Loader from './Loader';

type ViewState = 'loading' | 'journal-selection' | 'viewing';

function Journal() {
  const { config } = useContext(ConfigContext);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [journals, setJournals] = useState<JournalConfig[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalConfig | null>(
    null,
  );
  const [activity, setActivity] = useState<JournalActivity | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [notes, setNotes] = useState<Note[]>([]);
  const [todayNote, setTodayNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter state
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterAttributes, setFilterAttributes] = useState<string[]>([]);
  const [filterEmojis, setFilterEmojis] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<string[]>([]);
  const [availableEmojis, setAvailableEmojis] = useState<string[]>([]);
  const [showFilterTags, setShowFilterTags] = useState<boolean>(false);
  const [showFilterAttributes, setShowFilterAttributes] =
    useState<boolean>(false);
  const [showFilterEmojis, setShowFilterEmojis] = useState<boolean>(false);

  useEffect(() => {
    // Load journal configuration
    const loadJournals = () => {
      if (!config?.static?.journal) {
        setJournals([]);
        setViewState('loading');
        return;
      }

      const journalConfigs = config.static.journal;
      setJournals(journalConfigs);

      if (journalConfigs.length === 0) {
        setViewState('loading');
      } else if (journalConfigs.length === 1) {
        // Only one journal, skip selection
        setSelectedJournal(journalConfigs[0]);
        loadJournalActivity(journalConfigs[0]);
      } else {
        setViewState('journal-selection');
      }
    };

    loadJournals();
  }, [config]);

  const loadJournalActivity = async (journal: JournalConfig) => {
    if (!window.electron) return;

    try {
      const pathPrefix = extractPathPrefix(journal.path);
      const journalActivity = await window.electron.determineJournalActivity(
        journal.repository,
        pathPrefix,
      );
      setActivity(journalActivity);

      // Set default date range (last 3 months)
      const today = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);

      const endDate = formatDate(today);
      const startDate = journalActivity.minDate
        ? formatDate(
            new Date(
              Math.max(
                threeMonthsAgo.getTime(),
                new Date(journalActivity.minDate).getTime(),
              ),
            ),
          )
        : formatDate(threeMonthsAgo);

      setDateRange({ start: startDate, end: endDate });
      setViewState('viewing');
    } catch (error) {
      console.error('Error loading journal activity:', error);
    }
  };

  const handleJournalSelected = (journal: JournalConfig) => {
    setSelectedJournal(journal);
    loadJournalActivity(journal);
  };

  const loadJournalEntries = async () => {
    if (
      !selectedJournal ||
      !window.electron ||
      !dateRange.start ||
      !dateRange.end
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const pathPrefix = extractPathPrefix(selectedJournal.path);
      const entries = await window.electron.findJournalEntries(
        selectedJournal.repository,
        pathPrefix,
        dateRange.start,
        dateRange.end,
      );

      // Check if today's note exists - only check the first entry (entries are sorted DESC)
      // and only show today note if today is within the selected date range
      const today = formatDate(new Date());
      const todayInRange =
        today >= dateRange.start && today <= dateRange.end;
      const todayEntry =
        entries.length > 0 && entries[0].attributes.date === today
          ? entries[0]
          : null;

      if (!todayEntry && todayInRange) {
        // Create a dummy note for today
        const dummyNote: Note = {
          oid: 'today',
          oidFile: 'today',
          repositorySlug: selectedJournal.repository,
          repositoryPath: '',
          slug: 'today',
          type: 'Journal',
          relativePath: evaluateTemplateVariables(selectedJournal.path),
          wikilink: 'today',
          attributes: { date: today, title: today },
          tags: [],
          line: 0,
          title: 'Today',
          longTitle: 'Today',
          shortTitle: 'Today',
          marked: false,
          annotations: [],
          content: '',
          body: '',
          comment: '',
          items: undefined,
          medias: [],
        };
        setTodayNote(dummyNote);
        setNotes(entries);
      } else {
        setTodayNote(null);
        setNotes(entries);
      }

      // Extract unique tags, attributes, and emojis
      extractFiltersFromNotes(entries);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractFiltersFromNotes = (entries: Note[]) => {
    const tags = new Set<string>();
    const attributes = new Set<string>();
    const emojis = new Set<string>();

    entries.forEach((entry) => {
      // Extract tags
      if (entry.tags) {
        entry.tags.forEach((tag) => tags.add(tag));
      }

      // Extract attribute names
      if (entry.items?.attributes) {
        entry.items.attributes.forEach((attr) => attributes.add(attr.name));
      }

      // Extract emojis from items
      // The ListItem is a recursive datatype but we filter only top-level items to keep the implementation simple
      if (entry.items?.children) {
        entry.items.children.forEach((item) => {
          const emojiMatches = item.text?.match(/[\p{Emoji}]/gu);
          if (emojiMatches) {
            emojiMatches.forEach((emoji) => emojis.add(emoji));
          }
        });
      }
    });

    setAvailableTags(Array.from(tags).sort());
    setAvailableAttributes(Array.from(attributes).sort());
    setAvailableEmojis(Array.from(emojis).sort());
  };

  useEffect(() => {
    if (viewState === 'viewing' && dateRange.start && dateRange.end) {
      loadJournalEntries();
    }
  }, [viewState, dateRange]);

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
  };

  const handleRefresh = () => {
    loadJournalEntries();
  };

  const handleToggleFilterTag = (tag: string) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleToggleFilterAttribute = (attribute: string) => {
    setFilterAttributes((prev) =>
      prev.includes(attribute)
        ? prev.filter((a) => a !== attribute)
        : [...prev, attribute],
    );
  };

  const handleToggleFilterEmoji = (emoji: string) => {
    setFilterEmojis((prev) =>
      prev.includes(emoji) ? prev.filter((e) => e !== emoji) : [...prev, emoji],
    );
  };

  const handleRoutineComplete = async () => {
    // Force add the today note
    if (selectedJournal && window.electron) {
      try {
        const todayPath = evaluateTemplateVariables(selectedJournal.path);
        await window.electron.forceAdd(selectedJournal.repository, todayPath);
        // Refresh the journal entries
        await loadJournalEntries();
      } catch (error) {
        console.error('Error forcing add:', error);
      }
    }
  };

  if (viewState === 'loading') {
    return (
      <div className="Journal Screen">
        <Loader />
      </div>
    );
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
    );
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
          <Action
            icon={<RefreshIcon />}
            title="Refresh"
            onClick={handleRefresh}
          />
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
          <div className="JournalEntries">
            {/* Today's note */}
            {todayNote && (
              <div className="JournalEntry">
                <h3 className="JournalDate">Today</h3>
                <div className="TodayNote">
                  {selectedJournal.routines &&
                    selectedJournal.routines.length > 0 && (
                      <div className="Routines">
                        {selectedJournal.routines.map(
                          (routine: RoutineConfig) => (
                            <button
                              key={routine.name}
                              type="button"
                              onClick={() => {
                                // Show routine inline
                                const routineDiv = document.getElementById(
                                  `routine-${routine.name}`,
                                );
                                if (routineDiv) {
                                  routineDiv.style.display =
                                    routineDiv.style.display === 'none'
                                      ? 'block'
                                      : 'none';
                                }
                              }}
                            >
                              {routine.name}
                            </button>
                          ),
                        )}
                        {selectedJournal.routines.map(
                          (routine: RoutineConfig) => (
                            <div
                              key={`routine-${routine.name}`}
                              id={`routine-${routine.name}`}
                              style={{ display: 'none' }}
                            >
                              <RenderedRoutine
                                journal={selectedJournal}
                                routine={routine}
                                onComplete={handleRoutineComplete}
                              />
                            </div>
                          ),
                        )}
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Rendered notes */}
            {notes.map((note) => (
              <div key={note.oid} className="JournalEntry">
                <h3 className="JournalDate">
                  {note.attributes.date || 'Unknown Date'}
                </h3>
                <RenderedNote
                  note={note}
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
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="Journal Screen">
      <Loader />
    </div>
  );
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function evaluateTemplateVariables(template: string): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  return template
    .replaceAll('${year}', year)
    .replaceAll('${month}', month)
    .replaceAll('${day}', day);
}

/**
 * Extract the path prefix from a journal path template.
 * Returns the longest prefix without placeholders (${...}).
 * For example: 'journal/${year}/${year}-${month}-${day}.md' returns 'journal/'
 */
function extractPathPrefix(pathTemplate: string): string {
  // Find the first occurrence of ${
  const placeholderIndex = pathTemplate.indexOf('${');
  if (placeholderIndex === -1) {
    // No placeholders, return the whole path
    return pathTemplate;
  }
  // Return everything before the first placeholder
  return pathTemplate.substring(0, placeholderIndex);
}

export default Journal;
