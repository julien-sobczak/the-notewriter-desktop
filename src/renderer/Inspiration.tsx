import { useContext, useState } from 'react';
import {
  Eraser,
  SkipBack,
  SkipForward,
  SmileyXEyes,
} from '@phosphor-icons/react';
import { InspirationConfig, Note, Query, QueryResult } from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import RenderedNote from './RenderedNote';
import useKeyDown from './useKeyDown';

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
          <h2 className="instruction">Choose a category</h2>
          <ul className="categories">
            {inspirations?.map((inspiration: InspirationConfig) => (
              <li
                key={inspiration.name}
                onClick={() => handleCategorySelected(inspiration)}
              >
                {inspiration.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {selectedCategory && (
        <>
          <div className="Actions">
            <nav>
              <ul>
                {notes.length > 1 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handlePrevious()}
                      title="Next"
                    >
                      <SkipBack />
                    </button>
                  </li>
                )}
                {notes.length > 1 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNext()}
                      title="Previous"
                    >
                      <SkipForward />
                    </button>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(undefined)}
                    title="Reset"
                  >
                    <Eraser />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
          <div className="Content">
            {!note && <SmileyXEyes size={48} />}
            {note && (
              <RenderedNote
                note={note}
                showAttributes={false}
                showTags={false}
                showActions={false}
                showTitle={false}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Inspiration;
