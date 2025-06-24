import { useEffect, useContext, useState } from 'react';
import {
  StackSimple as DeckIcon,
  FilePlus as CommitIcon,
} from '@phosphor-icons/react';
import { ConfigContext } from './ConfigContext';
import {
  Deck,
  DeckRef,
  Flashcard,
  Review,
  RepositoryRefConfig,
} from '../shared/Model';
import Loader from './Loader';
import RenderedDeck from './RenderedDeck';

type DecksProps = {
  deck: DeckRef | undefined;
};

function Decks({ deck }: DecksProps) {
  const { config } = useContext(ConfigContext);

  // Read configured repositories (useful to populate the dropdown)
  const { repositories } = config.static;

  const [decks, setDecks] = useState<Deck[]>();
  const [selectedDeck, setSelectedDeck] = useState<DeckRef | undefined>(deck);

  // TODO remove Find decks to study with the number of cards to study today
  // onClick => Find flashcards to study, randomize them
  // onAnswer => Update flashcards in DB to save new SRS settings + append to current Study object in current "study" commit (NB: create the Study object if first card to be reviewed today)
  // onCommit => Push last Study objects to a new commit + update the commit-graph (otherwise the file will not be downloaded)

  // Download decks
  useEffect(() => {
    // Show only decks for currently selected decks
    const repositorySlugs: string[] = repositories
      .filter((w: RepositoryRefConfig) => w.selected)
      .map((w: RepositoryRefConfig) => w.slug);

    console.log('<Decks> slugs', repositorySlugs); // FIXME remove

    const listDecks = async () => {
      const results: Deck[] = await window.electron.listDecks(repositorySlugs);
      console.log('<Decks> decks', results); // FIXME remove
      setDecks(results);
    };
    listDecks();
  }, [repositories]);

  // Called every time a new flashcard has been reviewed.
  const onFlashcardReviewed = (
    deckRef: DeckRef,
    flashcard: Flashcard,
    review: Review,
  ) => {
    const updateFlashcard = async () => {
      const updatedFlashcard = await window.electron.updateFlashcard(
        deckRef,
        flashcard,
        review,
      );
      console.log(`Flashcard ${updatedFlashcard.shortTitle} saved`);
    };
    updateFlashcard();
  };

  // Called when the user completes all flashcards in a deck or
  // when exited prematurely when clicking on the icon.
  const onDeckQuitted = (deckRef: DeckRef) => {
    // Nothing to save as the study object is edited after every review
    // and only committed when explicitly said.
    console.log(
      `Quitted deck ${deckRef.key} in repository ${deckRef.repositorySlug}`,
    );
    setSelectedDeck(undefined);
  };

  return (
    <div className="Decks centered">
      {!decks && <Loader />}
      {!selectedDeck && decks && decks.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>New</th>
              <th>Due</th>
              <th>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {decks.map((currentDeck: Deck) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={currentDeck.key}>
                <td
                  onClick={() =>
                    setSelectedDeck({
                      repositorySlug: currentDeck.repositorySlug,
                      key: currentDeck.key,
                      name: currentDeck.config.name,
                    })
                  }
                >
                  <DeckIcon /> {currentDeck.config.name}
                </td>
                <td>{currentDeck.stats.new}</td>
                <td>{currentDeck.stats.due}</td>
                <td>
                  <CommitIcon />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selectedDeck && (
        <RenderedDeck
          deckRef={selectedDeck}
          onFlashcardReviewed={onFlashcardReviewed}
          onQuit={onDeckQuitted}
        />
      )}
    </div>
  );
}

export default Decks;
