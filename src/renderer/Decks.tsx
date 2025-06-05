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
  WorkspaceConfig,
} from '../shared/Model';
import Loader from './Loader';
import RenderedDeck from './RenderedDeck';

type DecksProps = {
  deck: DeckRef | undefined;
};

function Decks({ deck }: DecksProps) {
  const { config } = useContext(ConfigContext);

  // Read configured workspaces (useful to populate the dropdown)
  const { workspaces } = config.static;

  const [decks, setDecks] = useState<Deck[]>();
  const [selectedDeck, setSelectedDeck] = useState<DeckRef | undefined>(deck);

  // TODO remove Find decks to study with the number of cards to study today
  // onClick => Find flashcards to study, randomize them
  // onAnswer => Update flashcards in DB to save new SRS settings + append to current Study object in current "study" commit (NB: create the Study object if first card to be reviewed today)
  // onCommit => Push last Study objects to a new commit + update the commit-graph (otherwise the file will not be downloaded)

  // Download decks
  useEffect(() => {
    // Show only decks for currently selected decks
    const workspaceSlugs: string[] = workspaces
      .filter((w: WorkspaceConfig) => w.selected)
      .map((w: WorkspaceConfig) => w.slug);

    console.log('<Decks> slugs', workspaceSlugs); // FIXME remove

    fetch('http://localhost:3000/list-decks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workspaceSlugs),
    })
      .then((response) => response.json())
      .then((results: Deck[]) => {
        console.log('<Decks> decks', results); // FIXME remove
        setDecks(results);
        return null;
      })
      .catch((error: any) => console.log('Error:', error));
  }, [workspaces]);

  // Called every time a new flashcard has been reviewed.
  const onFlashcardReviewed = (
    deckRef: DeckRef,
    flashcard: Flashcard,
    review: Review,
  ) => {
    fetch('http://localhost:3000/update-flashcard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deckRef,
        flashcard,
        review,
      }),
    })
      .then((response) => response.json())
      .then((updatedFlashcard: Flashcard) => {
        console.log(`Flashcard ${updatedFlashcard.shortTitle} saved`);
        return null;
      })
      .catch((error: any) => console.log('Error:', error));
  };

  // Called when the user completes all flashcards in a deck or
  // when exited prematurely when clicking on the icon.
  const onDeckQuitted = (deckRef: DeckRef) => {
    // Nothing to save as the study object is edited after every review
    // and only committed when explicitly said.
    console.log(
      `Quitted deck ${deckRef.key} in workspace ${deckRef.workspaceSlug}`,
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
                      workspaceSlug: currentDeck.workspaceSlug,
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
