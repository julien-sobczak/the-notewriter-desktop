import { useState } from 'react';
import { Flashcard, Review } from '../shared/Model';

type RenderedFlashcardProps = {
  flashcard: Flashcard;
  onReviewed?: (review: Review) => void;
};

function RenderedFlashcard({ flashcard, onReviewed }: RenderedFlashcardProps) {
  // TODO useEffect to support key bindings to answers (like arrows)

  const [startTime] = useState<Date>(new Date());

  const onAnswered = (feedback: string) => {
    if (!onReviewed) return;
    const completionTime = new Date();
    onReviewed({
      flashcardOID: flashcard.oid,
      feedback,
      durationInMs: completionTime.getTime() - startTime.getTime(),
      completedAt: completionTime.toISOString(),
      dueAt: completionTime.toISOString(), // FIXME
      settings: flashcard.settings, // FIXME
    });
  };

  return (
    <div className="RenderedFlashcard">
      <h1>{flashcard.shortTitle}</h1>
      {/* TODO show content */}
      <div className="ButtonGroup">
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
      </div>
    </div>
    // TODO add buttons for too-easy and too-hard
  );
}

export default RenderedFlashcard;
