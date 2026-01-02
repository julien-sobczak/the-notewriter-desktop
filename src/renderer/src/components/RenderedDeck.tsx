import { useEffect, useContext, useState } from 'react'
import { SkipForwardIcon as SkipIcon, XIcon as CloseIcon } from '@phosphor-icons/react'
import { DeckRef, Flashcard, Review } from '@renderer/Model'
import Loader from './Loader'
import RenderedFlashcard from './RenderedFlashcard'
import { Action, Actions, Indicator } from './Actions'
import { ConfigContext } from '@renderer/ConfigContext'
import { intervalFn, NoteWriterSRS } from '@renderer/helpers/srs'

// Delay to consider a flashcard as due today
const DayCutoff = 1000 * 60 * 60 // 1 hour, used to determine if a flashcard is due today

type RenderedDeckProps = {
  deckRef: DeckRef
  onQuit?: (deckRef: DeckRef) => void
}

function RenderedDeck({ deckRef, onQuit = () => {} }: RenderedDeckProps) {
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
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0)

  // Download flashcard
  useEffect(() => {
    const listTodayFlashcards = async () => {
      const results = await window.api.listTodayFlashcards(deckRef)
      // TODO support different sorts
      const shuffledFlashcards = results.sort(() => 0.5 - Math.random())
      setFlashcards(shuffledFlashcards)
      setFlashcardIndex(0)
    }
    listTodayFlashcards()
  }, [deckRef])

  const onSkip = () => {
    if (!flashcards) return
    if (flashcardIndex + 1 < flashcards.length - 1) {
      setFlashcardIndex(flashcardIndex + 1)
    } else {
      onQuit(deckRef)
    }
  }

  // Called when the user completes the review of a single flashcard
  const onFlashcardReviewed = (flashcard: Flashcard, review: Review) => {
    // Reschedule the flashcard using the SRS algorithm
    const algorithm = new NoteWriterSRS()
    const scheduledFlashcard = algorithm.schedule(deckConfig, flashcard, review)
    // Update SRS settings based on the confidence
    review.dueAt = scheduledFlashcard.dueAt
    review.settings = scheduledFlashcard.settings

    window.api
      .reviewFlashcard(deckRef, flashcard, review)
      .then((updatedFlashcard: Flashcard) => {
        // Reschedule the flashcard if next review is imminent
        const nextDueAtTime = new Date(updatedFlashcard.dueAt).getTime()
        if (nextDueAtTime - Date.now() < DayCutoff) {
          setFlashcards([...(flashcards ?? []), updatedFlashcard])
        }
        if (flashcardIndex + 1 === flashcards?.length) {
          onQuit(deckRef)
        } else {
          setFlashcardIndex(flashcardIndex + 1)
        }
        return updatedFlashcard
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          // throw the error
          console.error('Error updating flashcard:', error.message)
        } else {
          console.error('Unknown error:', error)
        }
      })
  }

  return (
    <>
      {!flashcards && <Loader />}
      {flashcards && (
        <div className="RenderedDeck">
          <Actions>
            <Indicator>
              {flashcardIndex + 1} / <strong>{flashcards.length}</strong>
            </Indicator>
            <Action icon={<SkipIcon />} title="Skip" onClick={onSkip} />
            <Action icon={<CloseIcon />} title="Quit" onClick={() => onQuit(deckRef)} />
          </Actions>
          <RenderedFlashcard
            flashcard={flashcards[flashcardIndex]}
            intervalFn={intervalFn(deckConfig)}
            onReviewed={(review: Review) => onFlashcardReviewed(flashcards[flashcardIndex], review)}
          />
        </div>
      )}
    </>
  )
}

export default RenderedDeck
