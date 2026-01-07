/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react'
import {
  IconContext,
  EyeIcon as ShowIcon,
  ThumbsDownIcon as TooHardIcon,
  ThumbsUpIcon as TooEasyIcon,
  XCircleIcon as CancelIcon,
  IconProps
} from '@phosphor-icons/react'
import { Flashcard, Review } from '@renderer/Model'
import { feedbackToConfidence } from '@renderer/helpers/srs'
import Markdown from './Markdown'

type RenderedFlashcardProps = {
  flashcard: Flashcard
  intervalFn?: (flashcard: Flashcard, feedback: string) => string // Optional function to describe interval based on feedback
  onReviewed?: (review: Review) => void
}

function RenderedFlashcard({ flashcard, intervalFn, onReviewed }: RenderedFlashcardProps) {
  // TODO useEffect to support key bindings to answers (like arrows)

  const [startTime] = useState<Date>(new Date())
  const [revealed, setRevealed] = useState<boolean>(false)
  const [confirmationPending, setConfirmationPending] = useState<string>('') // "too-hard" or "too-easy". Empty means no confirmation is needed.

  const onAnswered = (feedback: string) => {
    if (!onReviewed) return
    const completionTime = new Date()

    // Map feedback strings to confidence numbers (0-100)
    const confidence = feedbackToConfidence[feedback]
    if (confidence === undefined) {
      throw new Error(`Unknown feedback type: ${feedback}`)
    }

    onReviewed({
      flashcardOID: flashcard.oid,
      confidence,
      durationInMs: completionTime.getTime() - startTime.getTime(),
      completedAt: completionTime.toISOString(),
      dueAt: completionTime.toISOString(),
      algorithm: 'nt0',
      settings: flashcard.settings
    })
    setRevealed(false)
  }

  const askConfirmationOnAnswer = (feedback: string) => {
    setConfirmationPending(feedback)
  }
  const onAnswerConfirmed = () => {
    onAnswered(confirmationPending)
    setConfirmationPending('')
  }
  const onAnswerCancelled = () => {
    setConfirmationPending('')
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!revealed && (e.key === 'Enter' || e.key === ' ')) {
        setRevealed(true)
      } else if (revealed && !confirmationPending) {
        if (e.key === '1') onAnswered('hard')
        if (e.key === '2') onAnswered('again')
        if (e.key === '3') onAnswered('good')
        if (e.key === '4') onAnswered('easy')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [revealed, confirmationPending])

  // Override Phosphor icon defaults as icons in buttons will be rendered on a dark background
  const iconContextValue: IconProps = useMemo(
    () => ({ color: 'white', weight: 'fill', size: 16 }),
    []
  )

  return (
    <div className="RenderedFlashcard">
      <div className="Content">
        <Markdown md={flashcard.front} />
        {revealed && <hr />}
        {revealed && <Markdown md={flashcard.back} />}
      </div>
      <div className="Source">
        {/* IMPROVEMENT Add an icon to edit the note in $EDITOR */}({flashcard.shortTitle})
      </div>
      <IconContext.Provider value={iconContextValue}>
        <div className="ButtonGroup">
          {!revealed && (
            <button type="button" onClick={() => setRevealed(true)} className="ShowAnswerButton">
              <ShowIcon />
            </button>
          )}
          {revealed && (
            <>
              {(!confirmationPending || confirmationPending === 'too-hard') && (
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmationPending) {
                      askConfirmationOnAnswer('too-hard')
                    } else {
                      onAnswerConfirmed()
                    }
                  }}
                  className="FeedbackButton FeedbackTooHard"
                >
                  <TooHardIcon />
                </button>
              )}
              {!confirmationPending && (
                <button
                  type="button"
                  onClick={() => onAnswered('hard')}
                  className="FeedbackButton FeedbackHard"
                >
                  Hard
                  {intervalFn && <sup className="Interval">{intervalFn(flashcard, 'hard')}</sup>}
                </button>
              )}
              {!confirmationPending && (
                <button
                  type="button"
                  onClick={() => onAnswered('again')}
                  className="FeedbackButton FeedbackAgain"
                >
                  Again
                  {intervalFn && <sup className="Interval">{intervalFn(flashcard, 'again')}</sup>}
                </button>
              )}
              {!confirmationPending && (
                <button
                  type="button"
                  onClick={() => onAnswered('good')}
                  className="FeedbackButton FeedbackGood"
                >
                  Good
                  {intervalFn && <sup className="Interval">{intervalFn(flashcard, 'good')}</sup>}
                </button>
              )}
              {!confirmationPending && (
                <button
                  type="button"
                  onClick={() => onAnswered('easy')}
                  className="FeedbackButton FeedbackEasy"
                >
                  Easy
                  {intervalFn && <sup className="Interval">{intervalFn(flashcard, 'easy')}</sup>}
                </button>
              )}
              {(!confirmationPending || confirmationPending === 'too-easy') && (
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmationPending) {
                      askConfirmationOnAnswer('too-easy')
                    } else {
                      onAnswerConfirmed()
                    }
                  }}
                  className="FeedbackButton FeedbackTooEasy"
                >
                  <TooEasyIcon />
                </button>
              )}
              {confirmationPending && (
                <button
                  type="button"
                  onClick={() => onAnswerCancelled()}
                  className="FeedbackButton FeedbackCancellation"
                >
                  <CancelIcon />
                </button>
              )}
            </>
          )}
        </div>
      </IconContext.Provider>
    </div>
  )
}

export default RenderedFlashcard
