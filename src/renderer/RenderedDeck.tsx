import { useEffect, useContext, useState } from 'react';
import { ConfigContext } from './ConfigContext';
import { DeckRef, Flashcard } from '../shared/Model';
import Loader from './Loader';
import RenderedFlashcard from './RenderedFlashcard';

type RenderedDeckProps = {
  deckRef: DeckRef;
};

function RenderedDeck({ deckRef }: RenderedDeckProps) {
  const { config } = useContext(ConfigContext);

  // Read deck config
  const deckConfig =
    config.collections[deckRef.workspaceSlug].deck[deckRef.key];
  console.log(deckConfig.name); // FIXME remove

  const [flashcards, setFlashcards] = useState<Flashcard[]>();
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);

  // Download flashcard
  useEffect(() => {
    fetch('http://localhost:3000/list-today-flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deckRef),
    })
      .then((response) => response.json())
      .then((results: Flashcard[]) => {
        // TODO support different sorts
        const shuffledFlashcards = results.sort(() => 0.5 - Math.random());
        setFlashcards(shuffledFlashcards);
        setFlashcardIndex(0);
        return null;
      })
      .catch((error: any) => console.log('Error:', error));
  }, [deckRef]);

  return (
    <>
      {!flashcards && <Loader />}
      {flashcards && (
        <div className="RenderedDeck">
          <RenderedFlashcard flashcard={flashcards[flashcardIndex]} />
        </div>
      )}
    </>
  );
}

export default RenderedDeck;
