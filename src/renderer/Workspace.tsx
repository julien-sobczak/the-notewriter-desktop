import { useState, useEffect, useRef, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import classNames from 'classnames';
import { Desk } from 'shared/model/Config';
import { Note } from '../shared/model/Note';
import { ConfigContext } from './ConfigContext';
import './Reset.css';
import './App.css';
import RenderedNote from './Note';

const { ipcRenderer } = window.electron;

type NotesCache = { [key: string]: Note[] };

function Workspace() {
  const { config, dispatch } = useContext(ConfigContext);

  const dynamicConfig = config.dynamic;

  const inputElement = useRef<HTMLInputElement>(null);
  const [inputQuery, setInputQuery] = useState<string>(''); // current input value
  const [searchQuery, setSearchQuery] = useState<string>(''); // last search value
  const [selectedDeskId, setSelectedDeskId] = useState<string | undefined>(
    undefined
  );
  const [notesByBlockID, setNotesByBlockID] = useState<NotesCache>({});

  const handleSearch = (event: any) => {
    const newDesk: Desk = {
      id: uuidv4(),
      name: 'Untitled',
      workspaces: [], // TODO use selected workspaces
      root: {
        id: uuidv4(),
        layout: 'container',
        size: null,
        elements: [],
        view: 'list',
        query: null,
      },
    };
    setSearchQuery(inputQuery);
    setSelectedDeskId(newDesk.id);
    dispatch({
      type: 'add-desk',
      payload: newDesk,
    });
    event.preventDefault();
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      return;
    }
    window.electron.ipcRenderer.sendMessage('search', searchQuery);
    ipcRenderer.on('search', (arg) => {
      const foundNotes = arg as Note[];
      for (const desk of dynamicConfig.desks) {
        // FIXME Rework to find the id from arg instead
        const newNotesByBlockID = {
          ...notesByBlockID,
        };
        newNotesByBlockID[desk.root.id] = foundNotes;
        setNotesByBlockID(newNotesByBlockID);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    inputElement.current?.focus();
  });

  return (
    <div>
      <header className="TopBar">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            ref={inputElement}
            name="search"
            value={inputQuery}
            onChange={(event: any) => setInputQuery(event.target.value)}
          />
        </form>
      </header>
      {dynamicConfig.desks && (
        <div className="DeskContainer">
          <nav>
            <ul>
              {dynamicConfig.desks.map((desk) => {
                return <li key={desk.id}>{desk.name}</li>;
              })}
            </ul>
          </nav>
          {dynamicConfig.desks.map((desk) => {
            return (
              <div
                key={desk.id}
                className={classNames({
                  selected: desk.id === selectedDeskId,
                })}
              >
                {notesByBlockID[desk.root.id]?.map((note) => {
                  return <RenderedNote key={note.oid} note={note} />;
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Workspace;
