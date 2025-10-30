import { useEffect, useContext, useState } from 'react'
import { StackSimpleIcon as DeckIcon, FilePlusIcon as FlushIcon } from '@phosphor-icons/react'
import { ConfigContext, getSelectedRepositorySlugs } from '@renderer/ConfigContext'
import { Deck, DeckRef } from '@renderer/Model'
import Loader from './Loader'
import RenderedDeck from './RenderedDeck'
import Slug from './Slug'
import Question from './Question'

type DecksProps = {
  deck: DeckRef | undefined
}

function Decks({ deck }: DecksProps) {
  const { config } = useContext(ConfigContext)

  // Read configured repositories (useful to populate the dropdown)
  const staticConfig = config.static

  const [decks, setDecks] = useState<Deck[]>()
  const [selectedDeck, setSelectedDeck] = useState<DeckRef | undefined>(deck)
  const [selectedRepositorySlugs, setSelectedRepositorySlugs] = useState<string[]>([])

  // Download decks
  useEffect(() => {
    const repositorySlugs = getSelectedRepositorySlugs(staticConfig)
    setSelectedRepositorySlugs(repositorySlugs)

    const listDecks = async () => {
      const results: Deck[] = await window.api.listDecks(repositorySlugs)
      setDecks(results)
    }
    listDecks()
  }, [staticConfig])

  // Called when the user selects a deck to study
  const onStudy = (clickedDeck: Deck) => {
    setSelectedDeck({ ...clickedDeck })
  }

  // Called when the user completes all flashcards in a deck or
  // when exited prematurely when clicking on the icon.
  const onDeckQuitted = (deckRef: DeckRef) => {
    // Nothing to save as the study object is edited after every review
    // and only committed when explicitly said.
    console.log(`Quitted deck ${deckRef.name} in repository ${deckRef.repositorySlug}`)
    setSelectedDeck(undefined)
  }

  // Called when the user clicks on the flush button for a given repository
  const onFlush = (repositorySlug: string) => async () => {
    await window.api.flushOperations([repositorySlug])
    console.log(`Flushed pending operations for repository ${repositorySlug}`)
  }

  if (!decks || decks.length === 0) return <Loader />

  if (selectedDeck) {
    return (
      <div className="FullScreen">
        <RenderedDeck deckRef={selectedDeck} onQuit={onDeckQuitted} />
      </div>
    )
  }

  return (
    <div className="Decks Screen">
      <div className="DecksSelection">
        <Question
          question="Select a deck to study"
          choices={decks}
          renderChoice={(currentDeck: Deck) => (
            <span>
              <DeckIcon /> {currentDeck.config.name} &nbsp;
              <sup>
                <span className="DecksNew">{currentDeck.stats.new}</span>/
                <span className="DecksDue">{currentDeck.stats.due}</span>
              </sup>
            </span>
          )}
          onChoiceSelected={onStudy}
        />
      </div>
      <div className="DecksSync">
        {selectedRepositorySlugs.map((repositorySlug) => (
          <div key={repositorySlug}>
            <Slug value={repositorySlug} />
            <button type="button" onClick={onFlush(repositorySlug)}>
              <FlushIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Decks
