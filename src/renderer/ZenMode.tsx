/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useRef, useState } from 'react';
import { Gauge, Pause, Play, SmileyXEyes } from '@phosphor-icons/react';
import classNames from 'classnames';
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

function ZenMode() {
  // Data management
  const [queriesLoaded, setQueriesLoaded] = useState<boolean>(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [index, setIndex] = useState<number>(0); // 0 <= index < note.length

  // Playback management
  const intervalRef = useRef<number>();
  const [paused, setPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(10); // seconds
  const [speedExpanded, setSpeedExpanded] = useState<boolean>(false);

  const { config } = useContext(ConfigContext);

  useEffect(() => {
    // Load notes based on configuration
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

  // Refresh periodically to iterate over notes
  useEffect(() => {
    if (notes.length === 0) return;

    if (paused && intervalRef.current) {
      clearInterval(intervalRef.current);
      return;
    }

    if (!paused) {
      intervalRef.current = window.setInterval(() => {
        if (index + 1 === notes.length) {
          // Loop on notes
          // If < 1000, not useful to query again
          // If == 1000, the user is probably sleeping 😴
          setIndex(0);
        } else {
          setIndex(index + 1);
        }
      }, speed * 1000);

      // eslint-disable-next-line consistent-return
      return () => clearInterval(intervalRef.current);
    }
  }, [speed, paused]);

  // Print a human-readable speed duration
  let speedLabel = '';
  if (speed < 60) {
    speedLabel = `${speed}s`;
  } else {
    const minutes = Math.round(speed / 60);
    const seconds = speed % 60;
    speedLabel = `${minutes}m`;
    if (seconds > 0) {
      speedLabel = `${speedLabel} ${seconds}s`;
    }
  }

  const handlePause = () => {
    // Interval will be cancelled by hook
    setPaused(false);
  };

  return (
    <div className="Screen ZenMode">
      {queriesLoaded && notes.length === 0 && <SmileyXEyes />}
      {queriesLoaded && notes.length > 0 && (
        <>
          <div className="Actions">
            <nav>
              <ul>
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
                      onClick={() => handlePause()}
                      title="Play"
                    >
                      <Play />
                    </button>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => setSpeedExpanded(!speedExpanded)}
                    title="Speed"
                  >
                    <Gauge />
                  </button>
                </li>
              </ul>
            </nav>
            <div
              className={classNames({
                SpeedAction: true,
                hidden: !speedExpanded,
              })}
            >
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
              />
              <br />
              {speedLabel}
            </div>
          </div>
          <div>
            <RenderedNote note={notes[index]} />
          </div>
        </>
      )}
    </div>
  );
}

export default ZenMode;
