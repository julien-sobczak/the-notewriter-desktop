import { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import StaticDesk from './StaticDesk';
import './Reset.css';
import './App.css';
import { Note } from '../shared/model/Note';

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
  }, [onClose]);

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

// TODO create Desk()

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
