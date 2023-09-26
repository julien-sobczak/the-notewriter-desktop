import { useEffect } from 'react';
import { Note } from '../shared/Model';

const { ipcRenderer } = window.electron;

function Inspiration() {
  useEffect(() => {
    // Retrieve a random quote
    ipcRenderer.sendMessage('get-daily-quote', []);

    ipcRenderer.on('get-daily-quote', (arg) => {
      const note = arg as Note;
      console.log(note);
    });
  }, []);

  return (
    <div className="Inspiration">
      <h1>Inspiration!</h1>
    </div>
  );
}

export default Inspiration;
