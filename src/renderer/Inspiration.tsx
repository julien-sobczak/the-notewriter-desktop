import React, { useContext, useState } from 'react';
import {
  Eraser,
  SkipBack,
  SkipForward,
  SmileyXEyes,
} from '@phosphor-icons/react';
import { InspirationConfig, Note, Query, QueryResult } from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import useKeyDown from './useKeyDown';
import FullScreenNote from './FullScreenNote';
import { Action, Actions } from './Actions';
import Question from './Question';

function extractQuery(inspiration: InspirationConfig): Query {
  // Convert all queries configured into valid Query
  const result: Query = {
    q: inspiration.query,
    repositories: inspiration.repositories ? inspiration.repositories : [],
    deskId: undefined,
    blockId: undefined,
    limit: 1000, // 1000 notes must be enough
    shuffle: true, // Important!
  };
  return result;
}

function Inspiration() {
  const { config } = useContext(ConfigContext);
  const { inspirations } = config.static;

  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [index, setIndex] = useState<number>(0); // 0 <= index < note.length

  // Support navigation using keys
  useKeyDown(() => {
    handlePrevious();
  }, ['ArrowLeft']);
  useKeyDown(() => {
    handleNext();
  }, ['ArrowRight']);

  // Not defined in configuration
  if (!inspirations) {
    return <SmileyXEyes size={48} />;
  }

  // Triggered when a user select a category among the configured ones
  const handleCategorySelected = (inspiration: InspirationConfig) => {
    setSelectedCategory(inspiration.name);

    // Load random notes
    const query = extractQuery(inspiration);
    console.info(`Searching for ${inspiration.name}...`);

    const search = async () => {
      const results: QueryResult = await window.electron.search(query);
      console.info(`Found ${results.notes.length} note(s)...`);
      setNotes(results.notes);
    };
    search();
  };

  // Triggered when the user move between notes
  const handlePrevious = () => {
    setIndex(Math.min(index - 1, 0)); // Stay at the beginning if moving backwards
  };
  const handleNext = () => {
    setIndex((index + 1) % notes.length); // Go back to first note at the end
  };

  // The current note to display (in any)
  const note: Note | undefined = notes.length ? notes[index] : undefined;

  return (
    <div className="Screen Inspiration">
      {!selectedCategory && (
        <div className="Content">
          <Question
            question="Choose a category"
            choices={inspirations}
            renderChoice={(inspiration: InspirationConfig) => inspiration.name}
            onChoiceSelected={handleCategorySelected}
          />
        </div>
      )}
      {selectedCategory && (
        <>
          <Actions>
            {notes.length > 1 && (
              <Action
                icon={<SkipBack />}
                title="Previous"
                onClick={handlePrevious}
                key="previous"
              />
            )}
            {notes.length > 1 && (
              <Action
                icon={<SkipForward />}
                title="Next"
                onClick={handleNext}
                key="next"
              />
            )}
            <Action
              icon={<Eraser />}
              title="Reset"
              onClick={() => setSelectedCategory(undefined)}
              key="reset"
            />
          </Actions>
          <div className="Content">
            {note && <FullScreenNote note={note} />}
          </div>
        </>
      )}
    </div>
  );
}

export default Inspiration;
