import { useEffect } from 'react';
import { Note } from '../shared/model/Note';

const { ipcRenderer } = window.electron;

function Stats() {
  useEffect(() => {
    // Retrieve a random quote
    ipcRenderer.sendMessage('get-daily-quote', []);

    ipcRenderer.on('get-daily-quote', (arg) => {
      const note = arg as Note;
      console.log(note);
    });
  }, []);

  return (
    <div className="Stats">
      <h1>Stats!</h1>
    </div>
  );
}

export default Stats;
