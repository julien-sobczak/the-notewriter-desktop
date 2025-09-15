/* eslint-disable react/no-array-index-key */
/* eslint-disable no-cond-assign */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-no-useless-fragment */
import React, { useState, useEffect, useRef, useContext } from 'react';
// import { v4 as uuidv4 } from 'uuid'; // uuidv4()
import {
  HandWaving,
  FileSearch,
  Desktop,
  Notebook,
  Brain,
  Kanban,
  Lightbulb,
  FlowerLotus,
  ChartBar,
  CornersOut,
  X,
  Icon,
  Star as BookmarkIcon,
  XCircle as CancelIcon,
  CheckCircle as OpenIcon,
  Bell,
  BellRinging,
} from '@phosphor-icons/react';
import classNames from 'classnames';
import { Command } from 'cmdk';
import {
  Desk,
  Query,
  QueryResult,
  RepositoryRefConfig,
  DeckRef,
  Bookmark,
  File,
  Goto,
  Reminder,
  Memory,
} from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import './Reset.css';
import './App.css';
import Hi from './Hi';
import Browser from './Browser';
import Bookmarker from './Bookmarker';
import Planner from './Planner';
import Stats from './Stats';
import Inspiration from './Inspiration';
import Decks from './Decks';
import ZenMode from './ZenMode';
import RenderedDesk from './RenderedDesk';
import NoteContainer from './NoteContainer';
import Journal from './Journal';
import Events from './EventsPopup';
import NoteType from './NoteType';
import Markdown from './Markdown';

const gotoRegex = /\$\{([a-zA-Z0-9_]+)(?::\[((?:[^\]]+))\])?\}/g;

type GotoPlaceholderProps = {
  name: string;
  values?: string[];
  value: string;
  onChange: (name: string, value: string) => void;
  inputRef?: React.Ref<any>;
};

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
  inputRef,
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
  );
}

type GotoFormProps = {
  url: string;
  onSubmit: (evaluatedUrl: string) => void;
  onCancel: () => void;
};

// Form to evaluate a Goto URL containing variable placeholders
function GotoForm({ url, onSubmit, onCancel }: GotoFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  // Keep a ref to the first form element to focus
  const firstInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Split the URL into parts: text and variable placeholders
  type Part =
    | { type: 'text'; value: string }
    | { type: 'placeholder'; name: string; values?: string[] };

  const parts: Part[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  gotoRegex.lastIndex = 0;
  while ((match = gotoRegex.exec(url)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: url.slice(lastIndex, match.index) });
    }
    const name = match[1];
    const optionsRaw = match[2];
    let options: string[] | undefined;
    if (optionsRaw) {
      options = optionsRaw.split(',').map((s) => s.trim());
    }
    parts.push({ type: 'placeholder', name, values: options });
    lastIndex = gotoRegex.lastIndex;
  }
  if (lastIndex < url.length) {
    parts.push({ type: 'text', value: url.slice(lastIndex) });
  }

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let evaluatedUrl = '';
    for (const part of parts) {
      if (part.type === 'text') {
        evaluatedUrl += part.value;
      } else if (part.type === 'placeholder') {
        evaluatedUrl += values[part.name] || '';
      }
    }
    onSubmit(evaluatedUrl);
  };

  // Cancel on ESC key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  // Focus the first placeholder
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  let firstPlaceholderRendered = false;

  return (
    <div className="GotoForm">
      <form onSubmit={handleSubmit}>
        <div className="GotoFormURL">
          {parts.map((part, idx) => {
            if (part.type === 'text') {
              return <span key={idx}>{part.value}</span>;
            }
            if (part.type === 'placeholder') {
              const ref = !firstPlaceholderRendered ? firstInputRef : undefined;
              firstPlaceholderRendered = true;
              return (
                <GotoPlaceholder
                  key={part.name + idx}
                  name={part.name}
                  values={part.values}
                  value={values[part.name] || ''}
                  onChange={handleChange}
                  inputRef={ref}
                />
              );
            }
            return null;
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
  );
}

type CommandMenuProps = {
  repositories: RepositoryRefConfig[];
  desks: Desk[] | null | undefined;
  decks: DeckRef[] | null | undefined;
  bookmarks: Bookmark[] | null | undefined;
  files: File[] | null | undefined;
  onActivitySelected?: (activity: string) => void;
  onRepositoryToggled?: (repository: RepositoryRefConfig) => void;
  onDeskSelected?: (desk: Desk) => void;
  onDeckSelected?: (desk: DeckRef) => void;
  onBookmarkSelected?: (bookmark: Bookmark) => void;
  onFileSelected?: (file: File) => void;
};

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
  onFileSelected = () => {},
}: CommandMenuProps) {
  const { config } = useContext(ConfigContext);
  const staticConfig = config.static;

  /*
   * Implementation based on project https://cmdk.paco.me/ (https://github.com/pacocoursey/cmdk)
   * Examples are available in GitHub. The linear style was used as the baseline:
   * - TypeScript: https://github.com/pacocoursey/cmdk/blob/main/website/components/cmdk/linear.tsx
   * - CSS: https://github.com/pacocoursey/cmdk/blob/main/website/styles/cmdk/linear.scss
   */
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [gotos, setGotos] = useState<Goto[]>([]);
  const [gotoFormURL, setGotoFormURL] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const page = pages[pages.length - 1];

  useEffect(() => {
    // Retrieve the statistics based on currently selected repositories
    const selectedRepositorySlugs = staticConfig.repositories
      .filter((repository: RepositoryRefConfig) => repository.selected)
      .map((repository: RepositoryRefConfig) => repository.slug);

    const listGotos = async () => {
      const results = await window.electron.listGotos(selectedRepositorySlugs);
      setGotos(results);
    };

    listGotos();
  }, [staticConfig.repositories]);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: any) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((isCurrentlyOpen) => !isCurrentlyOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const closeMenu = () => {
    setOpen(false);
    setSearch('');
    setPages([]);
  };

  const handleActivitySelected = (activitySlug: string) => {
    onActivitySelected(activitySlug);
    closeMenu();
  };

  const handleRepositoryToggled = (repository: RepositoryRefConfig) => {
    onRepositoryToggled(repository);
    closeMenu();
  };

  const handleDeskSelected = (desk: Desk) => {
    onDeskSelected(desk);
    closeMenu();
    onActivitySelected('desktop');
  };

  const handleDeckSelected = (deck: DeckRef) => {
    onDeckSelected(deck);
    closeMenu();
    onActivitySelected('decks');
  };

  const handleBookmarkSelected = (bookmark: Bookmark) => {
    onBookmarkSelected(bookmark);
    closeMenu();
    onActivitySelected('bookmarker');
  };

  const handleFileSelected = (file: File) => {
    onFileSelected(file);
    closeMenu();
    onActivitySelected('browser');
  };

  const handleGotoSelected = (goto: Goto) => {
    gotoRegex.lastIndex = 0;
    if (gotoRegex.test(goto.url)) {
      closeMenu();
      setGotoFormURL(goto.url);
    } else {
      window.electron.browseUrl(goto.url);
      closeMenu();
    }
  };

  const handleGotoFormSubmit = (evaluatedUrl: string) => {
    window.electron.browseUrl(evaluatedUrl);
    setGotoFormURL(null);
    closeMenu();
  };

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
            e.preventDefault();
            setPages((currentPages) => currentPages.slice(0, -1));
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
              <Command.Item onSelect={() => handleActivitySelected('hi')}>
                Hello
              </Command.Item>
            )}
            {!page && (
              <Command.Item onSelect={() => handleActivitySelected('hi')}>
                Bye
              </Command.Item>
            )}
            <Command.Separator />

            {!page && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'gotos']);
                  setSearch('');
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

            {!page && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'repositories']);
                  setSearch('');
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
                  setPages([...pages, 'files']);
                  setSearch('');
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
                  if (!file.relativePath.includes(search)) return null;
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
                  );
                })}
              </>
            )}

            {!page && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'desks']);
                  setSearch('');
                }}
              >
                Open desk...
              </Command.Item>
            )}
            {page === 'desks' && desks && (
              <>
                {desks.map((desk: Desk) => (
                  <Command.Item
                    key={desk.id}
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
              <Command.Item onSelect={() => handleActivitySelected('decks')}>
                Study
              </Command.Item>
            )}
            {!page && (
              <Command.Item
                onSelect={() => {
                  setPages([...pages, 'decks']);
                  setSearch('');
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
  );
}

export interface Activity {
  // Static description
  slug: string;
  // Human-readable description
  name: string;
  icon: Icon;
}

function Main() {
  const { config, dispatch } = useContext(ConfigContext);

  const staticConfig = config.static;
  const dynamicConfig = config.dynamic;
  const repositoryConfigs = config.repositories;
  const deckRefs = Object.keys(repositoryConfigs || {})
    .map((repositorySlug: string): DeckRef[] => {
      const repositoryConfig = repositoryConfigs[repositorySlug];
      const results: DeckRef[] = [];
      if (repositoryConfig.decks) {
        for (const deck of repositoryConfig.decks) {
          results.push({
            repositorySlug,
            name: deck.name,
          });
        }
      }
      return results;
    })
    .flat();

  // Global search
  const inputElement = useRef<HTMLInputElement>(null);
  const [inputQuery, setInputQuery] = useState<string>(''); // current input value
  const [searchQuery, setSearchQuery] = useState<string>(''); // last search value
  const [searchResults, setSearchResults] = useState<QueryResult | null>(null); // last search value results
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false); // display the aside panel with search results
  const [expandSearchResults, setExpandSearchResults] =
    useState<boolean>(false); // display the search panel in large

  // Activities
  const [activity, setActivity] = useState<string>('desktop');
  const previousActivity = useRef<string>('desktop');
  // Use this method to memorize the last activity (useful for example to come back when you left after the zen mode)
  const switchActivity = (newActivity: string) => {
    previousActivity.current = activity;
    setActivity(newActivity);
  };

  // Desks
  const [openedDesks, setOpenedDesks] = useState<Desk[]>([]);
  const [selectedDeskId, setSelectedDeskId] = useState<string | undefined>(
    undefined,
  );

  // Files
  const [files, setFiles] = useState<File[]>([]);

  // Selection
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>();
  const [selectedDeck, setSelectedDeck] = useState<DeckRef | undefined>();

  useEffect(() => {
    // Load all files to provide them in cmd+k
    const repositorySlugs: string[] = staticConfig.repositories.map(
      (w: RepositoryRefConfig) => w.slug,
    );

    const listFiles = async () => {
      const results: File[] = await window.electron.listFiles(
        repositorySlugs[0], // FIXME use all repositories?
      );
      setFiles(results);
    };
    listFiles();
  }, [staticConfig.repositories]);

  const handleSearch = (event: any) => {
    if (inputQuery === searchQuery) {
      // Query hasn't changed but results could have been collapsed
      setShowSearchResults(true);
    } else {
      // Trigger a new search
      setSearchQuery(inputQuery);
    }
    event.preventDefault();
  };

  const selectedRepositorySlugs = staticConfig.repositories
    .filter((repository: RepositoryRefConfig) => repository.selected)
    .map((repository: RepositoryRefConfig) => repository.slug);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      return;
    }
    console.debug(`Searching ${searchQuery}...`);
    const query: Query = {
      q: searchQuery,
      repositories: selectedRepositorySlugs,
      blockId: null,
      deskId: null,
      limit: 0,
      shuffle: false,
    };

    const search = async () => {
      const result: QueryResult = await window.electron.search(query);
      console.debug(
        `Found ${result.notes.length} results for ${result.query.q}`,
      );
      if (!result.query.blockId) {
        // global search
        setSearchResults(result);
        setShowSearchResults(true);
      }
    };
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    inputElement.current?.focus();
  });

  const handleRepositoryToggle = (slug: string) => {
    dispatch({
      type: 'toggleRepositorySelected',
      payload: slug,
    });
  };

  const handleDeskSelected = (desk: Desk) => {
    // Search in already open desks
    let found = false;
    for (const openedDesk of openedDesks) {
      if (openedDesk.id === desk.id) {
        found = true;
      }
    }
    if (!found) {
      // Open only if not already opened
      setOpenedDesks([...openedDesks, desk]);
    }
    // Use as default in all cases
    setSelectedDeskId(desk.id);
  };

  const handleDeskClick = (id: string) => {
    setSelectedDeskId(id);
  };

  const handleDeckSelected = (deck: DeckRef) => {
    setSelectedDeck(deck);
  };

  const handleBookmarkSelected = (bookmark: Bookmark) => {
    setSelectedBookmark(bookmark);
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleZenModeClose = () => {
    if (previousActivity.current) {
      setActivity(previousActivity.current);
    } else {
      switchActivity('hi');
    }
  };

  const activities: Activity[] = [
    {
      slug: 'hi',
      name: 'Hi',
      icon: HandWaving,
    },
    {
      slug: 'bookmarker',
      name: 'Bookmarker',
      icon: BookmarkIcon,
    },
    {
      slug: 'browser',
      name: 'Browser',
      icon: FileSearch,
    },
    {
      slug: 'desktop',
      name: 'Desktop',
      icon: Desktop,
    },
    {
      slug: 'journal',
      name: 'Journal',
      icon: Notebook,
    },
    {
      slug: 'decks',
      name: 'Study',
      icon: Brain,
    },
    {
      slug: 'tasks',
      name: 'Tasks',
      icon: Kanban,
    },
    {
      slug: 'inspiration',
      name: 'Inspiration',
      icon: Lightbulb,
    },
    {
      slug: 'zen',
      name: 'Zen Mode',
      icon: FlowerLotus,
    },
    {
      slug: 'stats',
      name: 'Statistics',
      icon: ChartBar,
    },
  ];

  return (
    <div
      className={classNames({
        Main,
        ZenModeEnabled: activity === 'zen',
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
          <nav className="RepositoryButtonGroup">
            {staticConfig.repositories.map(
              (repository: RepositoryRefConfig) => (
                <button
                  type="button"
                  key={repository.name}
                  className={classNames({ selected: repository.selected })}
                  onClick={() => handleRepositoryToggle(repository.slug)}
                >
                  {repository.name}
                </button>
              ),
            )}
          </nav>
          <Events />
        </form>
      </header>

      <CommandMenu
        // Data
        repositories={staticConfig.repositories}
        desks={dynamicConfig.desks}
        decks={deckRefs}
        bookmarks={dynamicConfig.bookmarks}
        files={files}
        // Events
        onActivitySelected={(activitySlug) => switchActivity(activitySlug)}
        onRepositoryToggled={(repository) =>
          handleRepositoryToggle(repository.slug)
        }
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
                  selected: activity === currentActivity.slug,
                })}
              >
                <button
                  type="button"
                  onClick={() => switchActivity(currentActivity.slug)}
                  title={currentActivity.name}
                  aria-label={currentActivity.name}
                >
                  <currentActivity.icon
                    weight={
                      activity === currentActivity.slug ? 'light' : 'thin'
                    }
                    size={24}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {showSearchResults && (
          <div
            className={classNames({
              SearchPanel: true,
              expanded: expandSearchResults,
            })}
          >
            <button
              className="top-left"
              type="button"
              onClick={() => setExpandSearchResults(!expandSearchResults)}
              title="Expand search panel"
            >
              <CornersOut />
            </button>
            <NoteContainer
              notes={searchResults?.notes}
              layout="list"
              layoutSelectable={false}
              onClose={() => setShowSearchResults(false)}
            />
          </div>
        )}

        {/* Hi */}
        {activity === 'hi' && <Hi />}

        {/* Bookmarks */}
        {activity === 'bookmarker' && (
          <Bookmarker bookmark={selectedBookmark} />
        )}

        {/* Browse */}
        {activity === 'browser' && <Browser file={selectedFile} />}

        {/* Desktop */}
        {activity === 'desktop' && (
          <>
            {/* TODO create a BlankDesk component to show recent opened desks
            like when opening Adobe Illustrator without any file selected */}
            {openedDesks && (
              <div className="DeskContainer">
                <nav>
                  <ul>
                    {openedDesks.map((desk) => (
                      <li
                        key={desk.id}
                        className={classNames({
                          selected: desk.id === selectedDeskId,
                        })}
                        onClick={() => handleDeskClick(desk.id)}
                      >
                        <span>{desk.name}</span>
                        <X size={12} />
                      </li>
                    ))}
                  </ul>
                </nav>
                {openedDesks.map((desk) => (
                  <RenderedDesk
                    key={desk.id}
                    desk={desk}
                    selected={desk.id === selectedDeskId}
                  />
                ))}
              </div>
            )}
          </>
        )}

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
  );
}

export default Main;

// TODO create a component Desk
// useState to store the current desk layout (updated when using click on close/split buttons)
// useRef to store the current version with change like resizing (= does not trigger a redraw) (updated every time)
// BUG: How to persist the data in useRef when leaving the application => Force user to save desk explicity using Ctrl+S (see hook https://stackoverflow.com/questions/70545552/custom-react-hook-on-ctrls-keydown)
