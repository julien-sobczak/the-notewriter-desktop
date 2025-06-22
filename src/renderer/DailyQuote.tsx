import { useState, useEffect } from 'react';
import { Note } from '../shared/Model';
import useKeyDown from './useKeyDown';

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
        // eslint-disable-next-line react/no-danger
        <div dangerouslySetInnerHTML={{ __html: dailyQuote.body }} />
      )}
    </div>
  );
}

export default DailyQuote;
