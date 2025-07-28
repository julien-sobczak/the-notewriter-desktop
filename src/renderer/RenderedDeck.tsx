import { useEffect, useContext, useState } from 'react';
import { SkipForward as SkipIcon, X as CloseIcon } from '@phosphor-icons/react';
import { ConfigContext } from './ConfigContext';
import { DeckRef, Flashcard, Review } from '../shared/Model';
import Loader from './Loader';
import RenderedFlashcard from './RenderedFlashcard';
import { intervalFn } from '../shared/srs';

// Delay to consider a flashcard as due today
const DayCutoff = 1000 * 60 * 60; // 1 hour, used to determine if a flashcard is due today

type RenderedDeckProps = {
  deckRef: DeckRef;
  onQuit?: (deckRef: DeckRef) => void;
};

function RenderedDeck({ deckRef, onQuit = () => {} }: RenderedDeckProps) {
  const { config } = useContext(ConfigContext);

  // Read deck config
  const repository = config.repositories[deckRef.repositorySlug];
  let deckConfig;
  if (repository.decks) {
    for (const deck of repository.decks) {
      if (deck.name === deckRef.name) {
        deckConfig = deck;
      }
    }
  }
  if (!deckConfig) {
    // throw an error instead
    throw new Error(
      `Deck ${deckRef.name} not found in repository ${deckRef.repositorySlug}`,
    );
  }

  const [flashcards, setFlashcards] = useState<Flashcard[]>();
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);

  // Download flashcard
  useEffect(() => {
    const listTodayFlashcards = async () => {
      const results = await window.electron.listTodayFlashcards(deckRef);
      // TODO support different sorts
      const shuffledFlashcards = results.sort(() => 0.5 - Math.random());
      setFlashcards(shuffledFlashcards);
      setFlashcardIndex(0);
    };
    listTodayFlashcards();
  }, [deckRef]);

  const onSkip = () => {
    if (!flashcards) return;
    if (flashcardIndex + 1 < flashcards.length - 1) {
      setFlashcardIndex(flashcardIndex + 1);
    } else {
      onQuit(deckRef);
    }
  };

  // Called when the user completes the review of a single flashcard
  const onFlashcardReviewed = (flashcard: Flashcard, review: Review) => {
    window.electron
      .reviewFlashcard(deckRef, flashcard, review)
      .then((updatedFlashcard: Flashcard) => {
        // Reschedule the flashcard if next review is imminent
        const nextDueAtTime = new Date(updatedFlashcard.dueAt).getTime();
        if (nextDueAtTime - Date.now() < DayCutoff) {
          setFlashcards([...(flashcards ?? []), updatedFlashcard]);
        }
        if (flashcardIndex + 1 === flashcards?.length) {
          onQuit(deckRef);
        } else {
          setFlashcardIndex(flashcardIndex + 1);
        }
        return updatedFlashcard;
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          // throw the error
          console.error('Error updating flashcard:', error.message);
        } else {
          console.error('Unknown error:', error);
        }
      });
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
                    disabled={flashcardIndex === flashcards.length - 1}
                    type="button"
                    onClick={onSkip}
                    title="Skip"
                  >
                    <SkipIcon />
                  </button>
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
            intervalFn={intervalFn(deckConfig)}
            onReviewed={(review: Review) =>
              onFlashcardReviewed(flashcards[flashcardIndex], review)
            }
          />
        </div>
      )}
    </>
  );
}

export default RenderedDeck;
