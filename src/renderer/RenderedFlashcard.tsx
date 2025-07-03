import { useState } from 'react';
import { Flashcard, Review } from '../shared/Model';
import Markdown from './Markdown';

type RenderedFlashcardProps = {
  flashcard: Flashcard;
  onReviewed?: (review: Review) => void;
};

function RenderedFlashcard({ flashcard, onReviewed }: RenderedFlashcardProps) {
  // TODO useEffect to support key bindings to answers (like arrows)

  const [startTime] = useState<Date>(new Date());
  const [revealed, setRevealed] = useState<boolean>(false);

  const onAnswered = (feedback: string) => {
    if (!onReviewed) return;
    const completionTime = new Date();
    onReviewed({
      flashcardOID: flashcard.oid,
      feedback,
      durationInMs: completionTime.getTime() - startTime.getTime(),
      completedAt: completionTime.toISOString(),
      dueAt: completionTime.toISOString(), // FIXME calculate next due date based on SRS settings
      settings: flashcard.settings, // FIXME update settings based on feedback
    });
  };

  return (
    <div className="RenderedFlashcard">
      <h1>{flashcard.shortTitle}</h1>
      <div>
        <Markdown md={flashcard.front} />
        {revealed && <hr />}
        {revealed && <Markdown md={flashcard.back} />}
      </div>
      <div className="ButtonGroup">
        {!revealed && (
          <button type="button" onClick={() => setRevealed(true)}>
            Show Answer
          </button>
        )}
        {revealed && (
          <>
            <button type="button" onClick={() => onAnswered('hard')}>
              Hard
            </button>
            <button type="button" onClick={() => onAnswered('again')}>
              Again
            </button>
            <button type="button" onClick={() => onAnswered('good')}>
              Good
            </button>
            <button type="button" onClick={() => onAnswered('easy')}>
              Easy
            </button>
          </>
        )}
      </div>
    </div>
    // TODO add buttons for too-easy and too-hard
  );
}

export default RenderedFlashcard;
