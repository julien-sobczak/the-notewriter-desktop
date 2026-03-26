import { useState } from 'react'
import { SkipForwardIcon as SkipIcon, XIcon as CloseIcon } from '@phosphor-icons/react'
import { Flashcard, Review } from '@renderer/Model'
import RenderedFlashcard from './RenderedFlashcard'
import { Action, Actions, Indicator } from './Actions'

type RenderedStudyProps = {
  flashcards: Flashcard[]
  mode: 'review' | 'test'
  onReview?: (flashcard: Flashcard, review: Review) => void
  onQuit?: () => void
}

function RenderedStudy({
  flashcards,
  mode,
  onReview = () => {},
  onQuit = () => {}
}: RenderedStudyProps) {
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0)

  const onSkip = () => {
    if (flashcardIndex + 1 < flashcards.length) {
      setFlashcardIndex(flashcardIndex + 1)
    } else {
      onQuit()
    }
  }

  const onFlashcardReviewed = (review: Review) => {
    onReview(flashcards[flashcardIndex], review)
    if (flashcardIndex + 1 === flashcards.length) {
      onQuit()
    } else {
      setFlashcardIndex(flashcardIndex + 1)
    }
  }

  if (flashcards.length === 0) {
    return (
      <div className="RenderedDeck">
        <span>
          <strong>No flashcards</strong> to review.
        </span>
        <button type="button" className="Button" onClick={onQuit}>
          Go back
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
          mode={mode}
          onReviewed={onFlashcardReviewed}
        />
      </div>
    </div>
  )
}

export default RenderedStudy
