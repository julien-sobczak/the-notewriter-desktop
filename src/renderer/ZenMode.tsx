/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Pause,
  PencilSimple,
  PersonSimpleRun,
  PersonSimpleWalk,
  Play,
  SmileyXEyes,
  Stop,
} from '@phosphor-icons/react';
import { ConfigContext } from './ConfigContext';
import { Note, ZenConfig, Query, QueryResult } from '../shared/Model';
import RenderedNote from './RenderedNote';

function extractQueries(zenMode: ZenConfig | undefined): Query[] {
  if (!zenMode) return [];

  // Convert all queries configured into valid Query
  const results: Query[] = [];
  for (const zenQuery of zenMode.queries) {
    results.push({
      q: zenQuery.query,
      workspaces: zenQuery.workspaces ? zenQuery.workspaces : [],
      deskId: undefined,
      blockId: undefined,
      limit: 1000, // 1000 notes must be enough
      shuffle: true, // Important!
    });
  }

  return results;
}

function getRandomInt() {
  return Math.floor(Math.random() * Number.MAX_VALUE);
}

type ZenModeProps = {
  onClose?: () => void;
};

/*
 * Zen Mode display random notes in full-screen mode at a repeated interval.
 * The screen can be exited by click on the stop button or pressing ESC.
 * Controls are available to adjust the speed of rendered notes.
 * These notes are rendered in a minimal style with minimal context present
 * in the footer.
 */
function ZenMode({ onClose = () => {} }: ZenModeProps) {
  // Data management
  const [queriesLoaded, setQueriesLoaded] = useState<boolean>(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [index, setIndex] = useState<number>(0); // 0 <= index < note.length

  // Playback management
  const intervalRef = useRef<number>(); // Required to cancel when pausing or during unmounting
  const [paused, setPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(10); // seconds

  const { config } = useContext(ConfigContext);

  // Utility function to move to the next note
  const moveToNextNote = () => {
    if (index + 1 === notes.length) {
      // Loop on notes
      // If < 1000, not useful to query again
      // If == 1000, the user is probably sleeping 😴
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
  };

  // Load notes based on configuration
  useEffect(() => {
    const queries = extractQueries(config.static.zenMode);

    if (queries.length === 0) {
      setQueriesLoaded(true);
    }

    fetch('http://localhost:3000/multi-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queries),
    })
      .then((response) => response.json())
      .then((results: QueryResult[]) => {
        setQueriesLoaded(true);
        const foundNotes: Note[] = [];
        for (const result of results) {
          foundNotes.push(...result.notes);
        }
        setNotes(foundNotes);
        return null;
      })
      .catch((error: any) => console.log('Error:', error));
  }, [config.static.zenMode]);

  // Exit Zen Mode on pressing ESC
  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', keyDownHandler);

    // Clean up event listener
    return () => {
      document.removeEventListener('keydown', keyDownHandler);
    };
  }, []);

  // Clear interval when component is unmounted
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  // Render occurs when the user pauses/resumes or a new note must be displayed.
  // We systematically restart the countdown.
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }
  // And start it only when not paused.
  if (!paused && notes.length > 0) {
    intervalRef.current = window.setInterval(() => {
      moveToNextNote();
    }, speed * 1000);
  }

  // The current note to display (in any)
  const note: Note | undefined = notes.length ? notes[index] : undefined;

  // Triggered when the user clicks in the footer to browse to the file externally
  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!note) return;
    const { ipcRenderer } = window.electron;
    ipcRenderer.sendMessage(
      'edit',
      note.workspaceSlug,
      note.relativePath,
      note.line
    );
  };

  return (
    <div className="Screen ZenMode">
      {/* Print an icon when no notes are found */}
      {queriesLoaded && !note && <SmileyXEyes size={48} />}

      {queriesLoaded && note && (
        <>
          <div className="Actions">
            <nav>
              <ul>
                {/* Make the timer the first icon to keep buttons at the same place even when the timer is hidden */}
                {!paused && (
                  <li>
                    {/* Use a unique key to restart the countdown after every render */}
                    <Timer key={getRandomInt()} duration={speed} />
                  </li>
                )}
                {!paused && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setPaused(true)}
                      title="Pause"
                    >
                      <Pause />
                    </button>
                  </li>
                )}
                {paused && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setPaused(false)}
                      title="Play"
                    >
                      <Play />
                    </button>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => onClose()}
                    title="Exit Zen Mode"
                  >
                    <Stop />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setSpeed(speed * 2)}
                    title="Speed down"
                  >
                    <PersonSimpleWalk />
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setSpeed(Math.round(speed / 2))}
                    title="Speed up"
                  >
                    <PersonSimpleRun />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
          <div className="Content">
            {/* Disable all "extra" information */}
            <RenderedNote
              note={note}
              showAttributes={false}
              showTags={false}
              showActions={false}
              showComment={false}
              showTitle={false}
            />
          </div>
          <div className="Footer">
            <div>
              <span
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: note.title,
                }}
              />
              <br />
              <span>
                <strong>{note.workspaceSlug}</strong>&nbsp;/&nbsp;
                {note.relativePath}
              </span>
            </div>
            <div>
              <button
                type="button"
                title="Edit in external editor"
                onClick={handleEdit}
              >
                <PencilSimple />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type TimerProps = {
  size?: number;
  duration?: number;
};

/*
 * A minimal pure CSS timer displaying the remaining time as a pie.
 */
function Timer({ size = 16, duration = 10 }: TimerProps) {
  // Based on https://stackoverflow.com/a/69481301
  const style = {
    '--duration': duration,
    '--size': size,
  } as React.CSSProperties;
  return (
    <div className="Timer" style={style}>
      <div className="mask" />
    </div>
  );
}

export default ZenMode;
