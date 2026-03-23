import { useEffect, useContext, useState } from 'react'
import { DeckRef, Flashcard } from '@renderer/Model'
import Loader from './Loader'
import RenderedFlashcards from './RenderedFlashcards'
import { ConfigContext } from '@renderer/ConfigContext'

type RenderedDeckProps = {
  deckRef: DeckRef
  onQuit?: (deckRef: DeckRef) => void
}

function RenderedDeck({ deckRef, onQuit = () => { } }: RenderedDeckProps) {
  const { config } = useContext(ConfigContext)

  // Read deck config
  const repository = config.repositories[deckRef.repositorySlug]
  let deckConfig
  if (repository.decks) {
    for (const deck of repository.decks) {
      if (deck.name === deckRef.name) {
        deckConfig = deck
      }
    }
  }
  if (!deckConfig) {
    // throw an error instead
    throw new Error(`Deck ${deckRef.name} not found in repository ${deckRef.repositorySlug}`)
  }

  const [flashcards, setFlashcards] = useState<Flashcard[]>()

  // Download flashcard
  useEffect(() => {
    const listTodayFlashcards = async () => {
      const results = await window.api.listTodayFlashcards(deckRef)
      // IMPROVEMENT support different sorts
      const shuffledFlashcards = results.sort(() => 0.5 - Math.random())
      setFlashcards(shuffledFlashcards)
    }
    listTodayFlashcards()
  }, [deckRef])

  return (
    <>
      {!flashcards && <Loader />}
      {flashcards && (
        <RenderedFlashcards
          flashcards={flashcards}
          deckRef={deckRef}
          deckConfig={deckConfig}
          onQuit={() => onQuit(deckRef)}
        />
      )}
    </>
  )
}

export default RenderedDeck

