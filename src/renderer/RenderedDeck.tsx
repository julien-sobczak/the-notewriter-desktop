import { useEffect, useContext, useState } from 'react';
import { X as CloseIcon } from '@phosphor-icons/react';
import { ConfigContext } from './ConfigContext';
import { DeckRef, Flashcard, Review } from '../shared/Model';
import Loader from './Loader';
import RenderedFlashcard from './RenderedFlashcard';

type RenderedDeckProps = {
  deckRef: DeckRef;
  onFlashcardReviewed?: (
    deckRef: DeckRef,
    flashcard: Flashcard,
    review: Review,
  ) => void;
  onQuit?: (deckRef: DeckRef) => void;
};

function RenderedDeck({
  deckRef,
  onFlashcardReviewed = () => {},
  onQuit = () => {},
}: RenderedDeckProps) {
  const { config } = useContext(ConfigContext);

  // Read deck config
  const deckConfig =
    config.repositories[deckRef.workspaceSlug].deck[deckRef.key];
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

  // Called when the user completes the review of a single flashcard
  const onReviewed = (flashcard: Flashcard, review: Review) => {
    // Apply SRS algorithm based on SRS Settings

    onFlashcardReviewed(deckRef, flashcard, review);
    if (flashcardIndex === flashcards?.length) {
      onQuit(deckRef);
    } else {
      setFlashcardIndex(flashcardIndex + 1);
    }
  };

  return (
    <>
      {!flashcards && <Loader />}
      {flashcards && (
        <div className="RenderedDeck">
          <div className="Actions">
            <nav>
              <ul>
                <li>
                  {flashcardIndex + 1} / <strong>{flashcards.length}</strong>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onQuit(deckRef)}
                    title="Next"
                  >
                    <CloseIcon />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
          <RenderedFlashcard
            flashcard={flashcards[flashcardIndex]}
            onReviewed={(review: Review) =>
              onReviewed(flashcards[flashcardIndex], review)
            }
          />
        </div>
      )}
    </>
  );
}

export default RenderedDeck;
