/* eslint-disable react/jsx-no-useless-fragment */
import { useState, useEffect, useRef, useContext } from 'react';
// import { v4 as uuidv4 } from 'uuid'; // uuidv4()
import classNames from 'classnames';
import {
  TbLamp2 as DesktopIcon,
  TbFiles as BrowseIcon,
  TbBrain as StudyIcon,
} from 'react-icons/tb';
import { HiOutlineLightBulb as InspirationIcon } from 'react-icons/hi';
import { BiStats as StatsIcon } from 'react-icons/bi';
import { IoJournal as JournalIcon } from 'react-icons/io5';
import { FaTasks as TasksIcon } from 'react-icons/fa';
import { PiHandWaving as HiIcon } from 'react-icons/pi';
import { GiMeditation as ZenIcon } from 'react-icons/gi';
import { Desk } from 'shared/model/Config';
import { Query, QueryResult } from '../shared/model/Query';
import { Note } from '../shared/model/Note';
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
import NotesContainer from './NoteContainer';
import Journal from './Journal';

const { ipcRenderer } = window.electron;

type NotesCache = { [key: string]: Note[] };

function Workspace() {
  const { config, dispatch } = useContext(ConfigContext);

  const staticConfig = config.static;
  const dynamicConfig = config.dynamic;

  // Global search
  const inputElement = useRef<HTMLInputElement>(null);
  const [inputQuery, setInputQuery] = useState<string>(''); // current input value
  const [searchQuery, setSearchQuery] = useState<string>(''); // last search value
  const [searchResults, setSearchResults] = useState<QueryResult | null>(null); // last search value results
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false); // display the aside panel with search results

  // Activities
  const [activity, setActivity] = useState<string>('desktop');

  const [selectedDeskId, setSelectedDeskId] = useState<string | undefined>(
    undefined
  );

  const [notesCache, setNotesCache] = useState<NotesCache>({});

  const handleSearch = (event: any) => {
    setSearchQuery(inputQuery);
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
    ipcRenderer.sendMessage('search', query);
    ipcRenderer.on('search', (arg) => {
      const result = arg as QueryResult;
      console.debug(
        `Found ${result.notes.length} results for ${result.query.q}`
      );
      if (result.query.blockId) {
        const newNotesCache: NotesCache = {
          ...notesCache,
        };
        newNotesCache[result.query.blockId] = result.notes;
        setNotesCache(newNotesCache);
      } else if (!result.query.deskId) {
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

  const handleWorkspaceClick = (name: string) => {
    dispatch({
      type: 'toggleWorkspaceSelected',
      payload: name,
    });
  };

  const handleDeskClick = (id: string) => {
    setSelectedDeskId(id);
  };

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
                onClick={() => handleWorkspaceClick(workspace.name)}
              >
                {workspace.name}
              </button>
            ))}
          </nav>
        </form>
      </header>

      <div className="Main">
        <div className="ActivityBar">
          <ul>
            <li className={classNames({ selected: activity === 'hi' })}>
              <button
                type="button"
                onClick={() => setActivity('hi')}
                aria-label="Hi"
              >
                <HiIcon />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'browse' })}>
              <button
                type="button"
                onClick={() => setActivity('browse')}
                aria-label="Browse"
              >
                <BrowseIcon />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'desktop' })}>
              <button
                type="button"
                onClick={() => setActivity('desktop')}
                aria-label="Desktop"
              >
                <DesktopIcon />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'journal' })}>
              <button
                type="button"
                onClick={() => setActivity('journal')}
                aria-label="Journal"
              >
                <JournalIcon />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'study' })}>
              <button
                type="button"
                onClick={() => setActivity('study')}
                aria-label="Flashcards"
              >
                <StudyIcon />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'tasks' })}>
              <button
                type="button"
                onClick={() => setActivity('tasks')}
                aria-label="Tasks"
              >
                <TasksIcon />
              </button>
            </li>
            <li
              className={classNames({ selected: activity === 'inspiration' })}
            >
              <button
                type="button"
                onClick={() => setActivity('inspiration')}
                aria-label="Inspiration"
              >
                <InspirationIcon />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'zen' })}>
              <button
                type="button"
                onClick={() => setActivity('zen')}
                aria-label="Zen Mode"
              >
                <ZenIcon />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'stats' })}>
              <button
                type="button"
                onClick={() => setActivity('stats')}
                aria-label="Statistics"
              >
                <StatsIcon />
              </button>
            </li>
          </ul>
        </div>

        {showSearchResults && (
          <div className="SearchPanel">
            <NotesContainer notes={searchResults?.notes} />
          </div>
        )}

        {/* Hi */}
        {activity === 'hi' && <Hi />}

        {/* Browse */}
        {activity === 'browse' && <Browser />}

        {/* Desktop */}
        {activity === 'desktop' && (
          <>
            {dynamicConfig.desks && (
              <div className="DeskContainer">
                <nav>
                  <ul>
                    {dynamicConfig.desks.map((desk) => (
                      <li
                        key={desk.id}
                        className={classNames({
                          selected: desk.id === selectedDeskId,
                        })}
                        onClick={() => handleDeskClick(desk.id)}
                      >
                        {desk.name}
                      </li>
                    ))}
                  </ul>
                </nav>
                {dynamicConfig.desks.map((desk) => (
                  <RenderedDesk
                    key={desk.id}
                    desk={desk}
                    notesCache={notesCache}
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
        {activity === 'study' && <Revision />}

        {/* Tasks */}
        {activity === 'tasks' && <Planner />}

        {/* Inspiration */}
        {activity === 'inspiration' && <Inspiration />}

        {/* Zen */}
        {activity === 'zen' && <ZenMode />}

        {/* Stats */}
        {activity === 'stats' && <Stats />}
      </div>
    </div>
  );
}

type RenderedDeskProps = {
  desk: Desk;
  notesCache: NotesCache;
  selected: boolean;
};

function RenderedDesk({ desk, notesCache, selected }: RenderedDeskProps) {
  return (
    <div className={classNames({ Desk: true, selected })}>
      <NotesContainer notes={notesCache[desk.root.id]} />
    </div>
  );
}

export default Workspace;

// TODO create a component Desk
// useState to store the current desk layout (updated when using click on close/split buttons)
// useRef to store the current version with change like resizing (= does not trigger a redraw) (updated every time)
// BUG: How to persist the data in useRef when leaving the application => Force user to save desk explicity using Ctrl+S (see hook https://stackoverflow.com/questions/70545552/custom-react-hook-on-ctrls-keydown)
