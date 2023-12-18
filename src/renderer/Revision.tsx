import { useEffect } from 'react';
import { Deck, Note } from '../shared/Model';

const { ipcRenderer } = window.electron;

type RevisionProps = {
  deck: Deck | undefined | null;
};

function Revision({ deck }: RevisionProps) {
  useEffect(() => {
    // TODO Find decks to study with the number of cards to study today
    // onClick => Find flashcards to study, randomize them
    // onAnswer => Update flashcards in DB to save new SRS settings + append to current Study object in current "study" commit (NB: create the Study object if first card to be reviewed today)
    // onCommit => Push last Study objects to a new commit + update the commit-graph (otherwise the file will not be downloaded)

    /*
    <RenderedFlashcard showAnswer={true} onAnswer={answer{durationInMs, grade, ...}}>

    </RenderedFlashcard>
    */
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
