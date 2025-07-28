import { useEffect, useContext, useState } from 'react';
import {
  StackSimple as DeckIcon,
  FilePlus as FlushIcon,
} from '@phosphor-icons/react';
import { ConfigContext } from './ConfigContext';
import { Deck, DeckRef, RepositoryRefConfig } from '../shared/Model';
import Loader from './Loader';
import RenderedDeck from './RenderedDeck';
import Slug from './Slug';

type DecksProps = {
  deck: DeckRef | undefined;
};

function Decks({ deck }: DecksProps) {
  const { config } = useContext(ConfigContext);

  // Read configured repositories (useful to populate the dropdown)
  const { repositories } = config.static;

  const [decks, setDecks] = useState<Deck[]>();
  const [selectedDeck, setSelectedDeck] = useState<DeckRef | undefined>(deck);

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

  // Called when the user completes all flashcards in a deck or
  // when exited prematurely when clicking on the icon.
  const onDeckQuitted = (deckRef: DeckRef) => {
    // Nothing to save as the study object is edited after every review
    // and only committed when explicitly said.
    console.log(
      `Quitted deck ${deckRef.name} in repository ${deckRef.repositorySlug}`,
    );
    setSelectedDeck(undefined);
  };

  const onFlush = (repositorySlug: string) => async () => {
    await window.electron.flushOperations([
      {
        repositorySlug,
      },
    ]);
    console.log(`Flushed pending operations for repository ${repositorySlug}`);
  };

  const onStudy = (clickedDeck: Deck) => {
    setSelectedDeck({ ...clickedDeck });
  };

  return (
    <div className="Decks centered">
      {!decks && <Loader />}
      {!selectedDeck && decks && decks.length > 0 && (
        <table className="List">
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>&nbsp;</th>
              <th>New</th>
              <th>Due</th>
              <th>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {decks.map((currentDeck: Deck) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={currentDeck.name}>
                <td>
                  <Slug value={currentDeck.repositorySlug} />
                </td>
                <td
                  onClick={() =>
                    setSelectedDeck({
                      repositorySlug: currentDeck.repositorySlug,
                      name: currentDeck.config.name,
                    })
                  }
                >
                  <button type="button" onClick={() => onStudy(currentDeck)}>
                    <DeckIcon /> {currentDeck.config.name}
                  </button>
                </td>
                <td>{currentDeck.stats.new}</td>
                <td>{currentDeck.stats.due}</td>
                <td>
                  {/* IMPROVEMENT move the button below decks as we flush per repository, not per deck really. */}
                  <button
                    type="button"
                    onClick={onFlush(currentDeck.repositorySlug)}
                  >
                    <FlushIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selectedDeck && (
        <RenderedDeck deckRef={selectedDeck} onQuit={onDeckQuitted} />
      )}
    </div>
  );
}

export default Decks;
