import { useState, useEffect, useRef, useContext } from 'react';
// import { v4 as uuidv4 } from 'uuid'; // uuidv4()
import classNames from 'classnames';
import { Desk } from 'shared/model/Config';
import { Note } from '../shared/model/Note';
import { ConfigContext } from './ConfigContext';
import './Reset.css';
import './App.css';
import RenderedNote from './Note';
import { Query, QueryResult } from '../shared/model/Query';

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

  const [selectedDeskId, setSelectedDeskId] = useState<string | undefined>(
    undefined
  );

  const [notesCache, setNotesCache] = useState<NotesCache>({});

  const handleSearch = (event: any) => {
    setSearchQuery(inputQuery);
    event.preventDefault();
  };

  const selectedWorkspaceNames = staticConfig.workspaces
    .filter((workspace) => workspace.selected)
    .map((workspace) => workspace.name);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      return;
    }
    console.debug(`Searching ${searchQuery}...`);
    const query: Query = {
      q: searchQuery,
      workspaces: selectedWorkspaceNames,
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
    <div>
      {/* Search bar */}
      <header className="TopBar">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            ref={inputElement}
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

      {showSearchResults && (
        <div className="SearchPanel">
          <NotesContainer notes={searchResults?.notes} />
        </div>
      )}

      {/* Desks */}
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

type NotesContainerProps = {
  notes: Note[] | undefined;
};

function NotesContainer({ notes }: NotesContainerProps) {
  return (
    <div>
      {notes?.map((note: Note) => {
        return <RenderedNote key={note.oid} note={note} />;
      })}
    </div>
  );
}

export default Workspace;

// TODO create a component Desk
// useState to store the current desk layout (updated when using click on close/split buttons)
// useRef to store the current version with change like resizing (= does not trigger a redraw) (updated every time)
// BUG: How to persist the data in useRef when leaving the application => Force user to save desk explicity using Ctrl+S (see hook https://stackoverflow.com/questions/70545552/custom-react-hook-on-ctrls-keydown)
