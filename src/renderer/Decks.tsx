import { useEffect, useContext, useState } from 'react';
import { ConfigContext } from './ConfigContext';
import { Deck, DeckRef } from '../shared/Model';
import Loader from './Loader';

type DecksProps = {
  deck: DeckRef | undefined;
};

function Decks({ deck }: DecksProps) {
  const { config } = useContext(ConfigContext);

  // Read configured workspaces (useful to populate the dropdown)
  const { workspaces } = config.static;

  const [decks, setDecks] = useState<Deck[]>();
  const [selectedDeck, setSelectedDeck] = useState<DeckRef | undefined>(deck);

  // TODO Find decks to study with the number of cards to study today
  // onClick => Find flashcards to study, randomize them
  // onAnswer => Update flashcards in DB to save new SRS settings + append to current Study object in current "study" commit (NB: create the Study object if first card to be reviewed today)
  // onCommit => Push last Study objects to a new commit + update the commit-graph (otherwise the file will not be downloaded)

  // Download decks
  useEffect(() => {
    // Show only decks for currently selected decks
    const workspaceSlugs: string[] = workspaces
      .filter((w) => w.selected)
      .map((w) => w.slug);

    fetch('http://localhost:3000/list-decks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workspaceSlugs),
    })
      .then((response) => response.json())
      .then((results: Deck[]) => {
        setDecks(results);
        return null;
      })
      .catch((error: any) => console.log('Error:', error));
  }, [workspaces]);

  return (
    <div className="Decks">
      {!decks && <Loader />}
      {!selectedDeck && decks && decks.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>New</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {decks.map((currentDeck: Deck) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr
                key={currentDeck.key}
                onClick={() =>
                  setSelectedDeck({
                    workspaceSlug: currentDeck.workspaceSlug,
                    key: currentDeck.key,
                    name: currentDeck.config.name,
                  })
                }
              >
                <tr>{currentDeck.config.name}</tr>
                <tr>{currentDeck.stats.new}</tr>
                <tr>{currentDeck.stats.due}</tr>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selectedDeck && selectedDeck.name}
    </div>
  );
}

export default Decks;
