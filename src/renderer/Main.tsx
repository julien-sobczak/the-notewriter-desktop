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
  HandsPraying,
  ChartBar,
  CornersOut,
  X,
  Icon,
} from '@phosphor-icons/react';
import classNames from 'classnames';
import { Command } from 'cmdk';
import { Deck, Desk, Query, QueryResult, Workspace } from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import './Reset.css';
import './App.css';
import Hi from './Hi';
import Browser from './Browser';
import Planner from './Planner';
import Stats from './Stats';
import Inspiration from './Inspiration';
import Revision from './Revision';
import ZenMode from './ZenMode';
import RenderedDesk from './RenderedDesk';
import NoteContainer from './NoteContainer';
import Journal from './Journal';
import Reminders from './Reminders';

const { ipcRenderer } = window.electron;

type CommandMenuProps = {
  // Style
  workspaces: Workspace[];
  desks: Desk[] | null | undefined;
  decks: Deck[] | null | undefined;
  onActivitySelected?: (activity: string) => void;
  onWorkspaceToggled?: (workspace: Workspace) => void;
  onDeskSelected?: (desk: Desk) => void;
  onDeckSelected?: (desk: Deck) => void;
};

function CommandMenu({
  workspaces,
  desks,
  decks,
  onActivitySelected = () => {},
  onWorkspaceToggled = () => {},
  onDeskSelected = () => {},
  onDeckSelected = () => {},
}: CommandMenuProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [pages, setPages] = useState<string[]>([]);
  const page = pages[pages.length - 1];

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

  const handleWorkspaceToggled = (workspace: Workspace) => {
    onWorkspaceToggled(workspace);
    closeMenu();
  };

  const handleDeskSelected = (desk: Desk) => {
    onDeskSelected(desk);
    closeMenu();
    onActivitySelected('desktop');
  };

  const handleDeckSelected = (deck: Deck) => {
    onDeckSelected(deck);
    closeMenu();
    onActivitySelected('study');
  };

  return (
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
                setPages([...pages, 'workspaces']);
                setSearch('');
              }}
            >
              Toggle workspace...
            </Command.Item>
          )}
          {page === 'workspaces' && (
            <>
              {workspaces.map((workspace: Workspace) => (
                <Command.Item
                  key={workspace.slug}
                  value={workspace.name}
                  onSelect={() => handleWorkspaceToggled(workspace)}
                >
                  Toggle workspace <em>{workspace.name}</em>
                </Command.Item>
              ))}
            </>
          )}

          <Command.Separator />

          {!page && <Command.Item>Open file...</Command.Item>}
          {/* TODO implement */}
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
            <Command.Item onSelect={() => handleActivitySelected('study')}>
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
              {decks.map((deck: Deck) => (
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
            <Command.Item onSelect={() => handleActivitySelected('reminders')}>
              Show reminders
            </Command.Item>
          )}
          {!page && (
            <Command.Item onSelect={() => handleActivitySelected('stats')}>
              Show statistics
            </Command.Item>
          )}
        </Command.Group>
        {!page && (
          <Command.Group heading="Favorites">
            {/* TODO populate from pinned notes */}
            <Command.Item>
              Milestones
              <span className="CommandItemMeta">
                <code>todo/milestone.md</code>
              </span>
            </Command.Item>
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
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

  // Desks
  const [openedDesks, setOpenedDesks] = useState<Desk[]>([]);
  const [selectedDeskId, setSelectedDeskId] = useState<string | undefined>(
    undefined
  );

  // Study
  const [selectedDeck, setSelectedDeck] = useState<Deck | undefined>();

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

  const selectedWorkspaceSlugs = staticConfig.workspaces
    .filter((workspace) => workspace.selected)
    .map((workspace) => workspace.slug);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      return;
    }
    console.debug(`Searching ${searchQuery}...`);
    const query: Query = {
      q: searchQuery,
      workspaces: selectedWorkspaceSlugs,
      blockId: null,
      deskId: null,
    };
    // TODO use REST API instead?
    ipcRenderer.sendMessage('search', query);
    ipcRenderer.on('search', (arg) => {
      const result = arg as QueryResult;
      console.debug(
        `Found ${result.notes.length} results for ${result.query.q}`
      );
      if (!result.query.blockId) {
        // global search
        setSearchResults(result);
        setShowSearchResults(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    inputElement.current?.focus();
  });

  const handleWorkspaceToggle = (slug: string) => {
    dispatch({
      type: 'toggleWorkspaceSelected',
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

  const handleDeckSelected = (deck: Deck) => {
    setSelectedDeck(deck);
  };

  const activities: Activity[] = [
    {
      slug: 'hi',
      name: 'Hi',
      icon: HandWaving,
    },
    {
      slug: 'browse',
      name: 'Browse',
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
      slug: 'study',
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
      icon: HandsPraying,
    },
    {
      slug: 'stats',
      name: 'Statistics',
      icon: ChartBar,
    },
  ];

  return (
    <div className="Workspace">
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
          <nav className="WorkspaceButtonGroup">
            {staticConfig.workspaces.map((workspace) => (
              <button
                type="button"
                key={workspace.name}
                className={classNames({ selected: workspace.selected })}
                onClick={() => handleWorkspaceToggle(workspace.slug)}
              >
                {workspace.name}
              </button>
            ))}
          </nav>
        </form>
      </header>

      <CommandMenu
        workspaces={staticConfig.workspaces}
        desks={dynamicConfig.desks}
        decks={staticConfig.study?.decks}
        onActivitySelected={(activitySlug) => setActivity(activitySlug)}
        onWorkspaceToggled={(workspace) =>
          handleWorkspaceToggle(workspace.slug)
        }
        onDeskSelected={handleDeskSelected}
        onDeckSelected={handleDeckSelected}
      />

      <div className="Main">
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
                  onClick={() => setActivity(currentActivity.slug)}
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

        {/* Browse */}
        {activity === 'browse' && <Browser />}

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
        {activity === 'study' && <Revision deck={selectedDeck} />}

        {/* Tasks */}
        {activity === 'tasks' && <Planner />}

        {/* Inspiration */}
        {activity === 'inspiration' && <Inspiration />}

        {/* Zen */}
        {activity === 'zen' && <ZenMode />}

        {/* Stats */}
        {activity === 'stats' && <Stats />}

        {/* Reminders */}
        {activity === 'reminders' && <Reminders />}
      </div>
    </div>
  );
}

export default Main;

// TODO create a component Desk
// useState to store the current desk layout (updated when using click on close/split buttons)
// useRef to store the current version with change like resizing (= does not trigger a redraw) (updated every time)
// BUG: How to persist the data in useRef when leaving the application => Force user to save desk explicity using Ctrl+S (see hook https://stackoverflow.com/questions/70545552/custom-react-hook-on-ctrls-keydown)
