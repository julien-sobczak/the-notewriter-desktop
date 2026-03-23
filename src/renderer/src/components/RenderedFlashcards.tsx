import { useState } from 'react'
import { SkipForwardIcon as SkipIcon, XIcon as CloseIcon } from '@phosphor-icons/react'
import { DeckConfig, DeckRef, Flashcard, Review } from '@renderer/Model'
import RenderedFlashcard from './RenderedFlashcard'
import { Action, Actions, Indicator } from './Actions'
import { intervalFn, NoteWriterSRS } from '@renderer/helpers/srs'

// Delay to consider a flashcard as due today
const DayCutoff = 1000 * 60 * 60 // 1 hour, used to determine if a flashcard is due today

type RenderedFlashcardsProps = {
  flashcards: Flashcard[]
  deckRef: DeckRef
  deckConfig: DeckConfig
  onQuit?: () => void
}

function RenderedFlashcards({
  flashcards: initialFlashcards,
  deckRef,
  deckConfig,
  onQuit = () => {}
}: RenderedFlashcardsProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards)
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0)

  const onSkip = () => {
    if (flashcardIndex + 1 < flashcards.length) {
      setFlashcardIndex(flashcardIndex + 1)
    } else {
      onQuit()
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
      .reviewFlashcard(deckRef, scheduledFlashcard, review)
      .then((updatedFlashcard: Flashcard) => {
        // Reschedule the flashcard if next review is imminent
        const nextDueAtTime = new Date(updatedFlashcard.dueAt).getTime()
        if (nextDueAtTime - Date.now() < DayCutoff) {
          setFlashcards([...flashcards, updatedFlashcard])
        }
        if (flashcardIndex + 1 === flashcards.length) {
          onQuit()
        } else {
          setFlashcardIndex(flashcardIndex + 1)
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

  if (flashcards.length === 0) {
    return (
      <div className="RenderedDeck">
        <span>
          <strong>No flashcards</strong> to review for today.
        </span>
        <button type="button" className="Button" onClick={onQuit}>
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="RenderedDeck">
      <Actions>
        <Indicator>
          {flashcardIndex + 1} / <strong>{flashcards.length}</strong>
        </Indicator>
        <Action icon={<SkipIcon />} title="Skip" onClick={onSkip} />
        <Action icon={<CloseIcon />} title="Quit" onClick={onQuit} />
      </Actions>
      <div className="FlashcardContainer">
        <RenderedFlashcard
          flashcard={flashcards[flashcardIndex]}
          intervalFn={intervalFn(deckConfig)}
          onReviewed={(review: Review) =>
            onFlashcardReviewed(flashcards[flashcardIndex], review)
          }
        />
      </div>
    </div>
  )
}

export default RenderedFlashcards
