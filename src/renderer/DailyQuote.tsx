import { useState, useEffect } from 'react';
import { Note } from '../shared/Model';
import useKeyDown from './useKeyDown';
import Markdown from './Markdown';

const { ipcRenderer } = window.electron;

function DailyQuote({ onClose }: any) {
  const [dailyQuote, setDailyQuote] = useState<Note | undefined>(undefined);

  useEffect(() => {
    // Retrieve a random quote
    ipcRenderer.sendMessage('get-daily-quote', []);

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
        <div>
          <Markdown md={dailyQuote.body} />
        </div>
      )}
    </div>
  );
}

export default DailyQuote;
