import { useEffect, useContext, useState } from 'react'
import { DeckRef, Flashcard, Review } from '@renderer/Model'
import Loader from './Loader'
import RenderedStudy from './RenderedStudy'
import { ConfigContext } from '@renderer/ConfigContext'
import { intervalFn, NoteWriterSRS } from '@renderer/helpers/srs'

// Delay to consider a flashcard as due today
const DayCutoff = 1000 * 60 * 60 // 1 hour, used to determine if a flashcard is due today

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

  // Called when the user completes the review of a single flashcard
  const onFlashcardReviewed = (flashcard: Flashcard, review: Review) => {
    // Reschedule the flashcard using the SRS algorithm
    const algorithm = new NoteWriterSRS()
    const scheduledFlashcard = algorithm.schedule(deckConfig!, flashcard, review)
    // Update SRS settings based on the confidence
    review.dueAt = scheduledFlashcard.dueAt
    review.settings = scheduledFlashcard.settings

    window.api
      .reviewFlashcard(deckRef, scheduledFlashcard, review)
      .then((updatedFlashcard: Flashcard) => {
        // Reschedule the flashcard if next review is imminent
        const nextDueAtTime = new Date(updatedFlashcard.dueAt).getTime()
        if (nextDueAtTime - Date.now() < DayCutoff) {
          setFlashcards([...(flashcards ?? []), updatedFlashcard])
        }
        return updatedFlashcard
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          console.error('Error updating flashcard:', error.message)
        } else {
          console.error('Unknown error:', error)
        }
      })
  }

  if (!flashcards) {
    return <Loader />
  }

  return (
    <RenderedStudy
      flashcards={flashcards}
      mode="review"
      intervalFn={intervalFn(deckConfig)}
      onReview={onFlashcardReviewed}
      onQuit={() => onQuit(deckRef)}
    />
  )
}

export default RenderedDeck
