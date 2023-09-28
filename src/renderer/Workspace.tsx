/* eslint-disable react/jsx-no-useless-fragment */
import { useState, useEffect, useRef, useContext } from 'react';
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
  X,
} from '@phosphor-icons/react';
import classNames from 'classnames';
import { Query, QueryResult } from '../shared/Model';
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

const { ipcRenderer } = window.electron;

/*
 * TODO Cmd+K
 *
 * open desk ${name}
 * show reminders
 * hi/hello/bonjour
 * bye
 * open file
 * launch zen mode
 */

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
                <HandWaving
                  weight={activity === 'hi' ? 'light' : 'thin'}
                  size={24}
                />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'browse' })}>
              <button
                type="button"
                onClick={() => setActivity('browse')}
                aria-label="Browse"
              >
                <FileSearch
                  weight={activity === 'browse' ? 'light' : 'thin'}
                  size={24}
                />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'desktop' })}>
              <button
                type="button"
                onClick={() => setActivity('desktop')}
                aria-label="Desktop"
              >
                <Desktop
                  weight={activity === 'desktop' ? 'light' : 'thin'}
                  size={24}
                />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'journal' })}>
              <button
                type="button"
                onClick={() => setActivity('journal')}
                aria-label="Journal"
              >
                <Notebook
                  weight={activity === 'journal' ? 'light' : 'thin'}
                  size={24}
                />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'study' })}>
              <button
                type="button"
                onClick={() => setActivity('study')}
                aria-label="Flashcards"
              >
                <Brain
                  weight={activity === 'study' ? 'light' : 'thin'}
                  size={24}
                />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'tasks' })}>
              <button
                type="button"
                onClick={() => setActivity('tasks')}
                aria-label="Tasks"
              >
                <Kanban
                  weight={activity === 'tasks' ? 'light' : 'thin'}
                  size={24}
                />
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
                <Lightbulb
                  weight={activity === 'inspiration' ? 'light' : 'thin'}
                  size={24}
                />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'zen' })}>
              <button
                type="button"
                onClick={() => setActivity('zen')}
                aria-label="Zen Mode"
              >
                <HandsPraying
                  weight={activity === 'zen' ? 'light' : 'thin'}
                  size={24}
                />
              </button>
            </li>
            <li className={classNames({ selected: activity === 'stats' })}>
              <button
                type="button"
                onClick={() => setActivity('stats')}
                aria-label="Statistics"
              >
                <ChartBar
                  weight={activity === 'stats' ? 'light' : 'thin'}
                  size={24}
                />
              </button>
            </li>
          </ul>
        </div>

        {showSearchResults && (
          <div className="SearchPanel">
            <NoteContainer notes={searchResults?.notes} />
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
                        <span>{desk.name}</span>
                        <X size={12} />
                      </li>
                    ))}
                  </ul>
                </nav>
                {dynamicConfig.desks.map((desk) => (
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
        {activity === 'study' && <Revision />}

        {/* Tasks */}
        {activity === 'tasks' && <Planner />}

        {/* Inspiration */}
        {activity === 'inspiration' && <Inspiration />}

        {/* Zen */}
        {activity === 'zen' && <ZenMode />}

        {/* Stats */}
        {activity === 'stats' && <Stats workspaces={selectedWorkspaceSlugs} />}
      </div>
    </div>
  );
}

export default Workspace;

// TODO create a component Desk
// useState to store the current desk layout (updated when using click on close/split buttons)
// useRef to store the current version with change like resizing (= does not trigger a redraw) (updated every time)
// BUG: How to persist the data in useRef when leaving the application => Force user to save desk explicity using Ctrl+S (see hook https://stackoverflow.com/questions/70545552/custom-react-hook-on-ctrls-keydown)
