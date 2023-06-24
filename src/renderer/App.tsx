import { useState, useEffect, useRef, useContext } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import classNames from 'classnames';
import { Desk, EditorDynamicConfig } from 'shared/model/Config';
import { Note } from '../shared/model/Note';
import StaticDesk from './StaticDesk';
import { ConfigContext, ConfigContextProvider } from './ConfigContext';
import './Reset.css';
import './App.css';
import RenderedNote from './Note';

const { ipcRenderer } = window.electron;

// https://medium.com/@paulohfev/problem-solving-custom-react-hook-for-keydown-events-e68c8b0a371
export const useKeyDown = (callback: any, keys: any) => {
  useEffect(() => {
    const onKeyDown = (event: any) => {
      const wasAnyKeyPressed = keys.some((key: string) => event.key === key);
      if (wasAnyKeyPressed) {
        event.preventDefault();
        callback();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [callback, keys]);
};

function DailyQuote({ onClose }: any) {
  const [dailyQuote, setDailyQuote] = useState<Note | undefined>(undefined);

  // Retrieve a random quote
  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('get-daily-quote', []);

    ipcRenderer.on('get-daily-quote', (arg) => {
      const note = arg as Note;
      setDailyQuote(note);
    });
  }, []);

  // Close after one minute
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 60000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // or close after pressing enter
  useKeyDown(() => {
    onClose();
  }, ['Enter']);

  return (
    <div className="DailyQuote">
      {dailyQuote && (
        // eslint-disable-next-line react/no-danger
        <div dangerouslySetInnerHTML={{ __html: dailyQuote.content }} />
      )}
    </div>
  );
}

type NotesCache = { [key: string]: Note[] };

function Workspace() {
  const { state, dispatch } = useContext(ConfigContext);

  const dynamicConfig = state.dynamic as EditorDynamicConfig;

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

function Home() {
  const [showDailyQuote, setShowDailyQuote] = useState(true);
  return (
    <>
      {showDailyQuote && (
        <DailyQuote onClose={() => setShowDailyQuote(false)} />
      )}
      {!showDailyQuote && <Workspace />}
      {true && false && <StaticDesk />} {/* TODO remove */}
    </>
  );
}

export default function App() {
  return (
    <ConfigContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </ConfigContextProvider>
  );
}
