import { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './Reset.css';
import './App.css';
import { Note } from '../shared/model/Note';

import { VscSplitHorizontal } from 'react-icons/vsc';
import { VscSplitVertical } from 'react-icons/vsc';

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
      console.log(note.content);
    });
  }, []);

  // Close after one minute
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 60000);
    return () => clearTimeout(timer);
  }, []);

  // or close after pressing enter
  useKeyDown(() => {
    onClose();
  }, ['Enter']);

  return (
    <div className="DailyQuote">
      {dailyQuote && (
        <div dangerouslySetInnerHTML={{ __html: dailyQuote.content }} />
      )}
    </div>
  );
}

function Actions() {
  return (
    <div className="Actions">
      <nav>
        <ul>
          <li>
            <VscSplitHorizontal />
          </li>
          <li>
            <VscSplitVertical />
          </li>
        </ul>
      </nav>
    </div>
  );
}


// TODO create Desk()

function StaticDesk() {
  // Demo (TODO load from configuration)
  const workspace = {
    name: 'My Project',
    workspace: 'main',
    root: {
      layout: 'horizontal',
      elements: [
        {
          layout: 'container',
          width: '70%',
          query: 'path:projects/my-project (kind:note)',
        },
        {
          layout: 'vertical',
          elements: [
            {
              layout: 'container',
              query: 'path:projects/my-project kind:todo title:Backlog',
              view: 'single',
              height: '30%',
            },
            {
              layout: 'container',
              query: 'path:projects/my-project (kind:reference or kind:quote)',
            },
          ],
        },
      ],
    },
  };

  console.log(workspace);

  return (
    <div className="Desk">
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <div className="Grid">
        <Actions />
        <div className="HorizontalPane">
          <Actions />
          <div className="VerticalPane">
            <Actions />
            <div className="Container" style={{ height: '75%' }}>
              <Actions />
              <div className="Note">Note 1</div>
              <div className="Note">Note 2</div>
              <div className="Note">Note 3</div>
            </div>
            <div className="Container">
              <Actions />
              <div className="Note">Note 1</div>
              <div className="Note">Note 2</div>
            </div>
          </div>
          <div className="VerticalPane">
            <Actions />
            <div className="Container">
              <Actions />
              <div className="Note">Note 1</div>
              <div className="Note">Note 2</div>
            </div>
          </div>
        </div>
      </div>
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
      {!showDailyQuote && <StaticDesk />}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}
