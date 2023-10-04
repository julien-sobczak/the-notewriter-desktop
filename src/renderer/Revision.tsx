import { useEffect } from 'react';
import { Deck, Note } from '../shared/Model';

const { ipcRenderer } = window.electron;

type RevisionProps = {
  deck: Deck | undefined | null;
};

function Revision({ deck }: RevisionProps) {
  useEffect(() => {
    // Retrieve a random quote
    ipcRenderer.sendMessage('get-daily-quote', []);

    ipcRenderer.on('get-daily-quote', (arg) => {
      const note = arg as Note;
      console.log(note);
    });
  }, []);

  return (
    <div className="Revision">
      <h1>
        Study
        {deck && deck.name}
      </h1>
    </div>
  );
}

export default Revision;
