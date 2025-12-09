/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useRef, useState } from 'react'
import {
  PauseIcon,
  PersonSimpleRunIcon,
  PersonSimpleWalkIcon,
  PlayIcon,
  SmileyXEyesIcon,
  StopIcon
} from '@phosphor-icons/react'
import { Note, ZenConfig, Query, QueryResult } from '@renderer/Model'
import FullScreenNote from './FullScreenNote'
import { Action, Actions, Indicator } from './Actions'
import { ConfigContext } from '@renderer/ConfigContext'
import useKeyDown from '@renderer/helpers/useKeyDown'

function extractQueries(zenMode: ZenConfig | undefined): Query[] {
  if (!zenMode) return []

  // Convert all queries configured into valid Query
  const results: Query[] = []
  for (const zenQuery of zenMode.queries) {
    results.push({
      q: zenQuery.query,
      repositories: zenQuery.repositories ? zenQuery.repositories : [],
      deskOid: undefined,
      blockOid: undefined,
      limit: 1000, // 1000 notes must be enough
      shuffle: true // Important!
    })
  }

  return results
}

function getRandomInt() {
  return Math.floor(Math.random() * Number.MAX_VALUE)
}

type ZenModeProps = {
  onClose?: () => void
}

/*
 * Zen Mode display random notes in full-screen mode at a repeated interval.
 * The screen can be exited by click on the stop button or pressing ESC.
 * Controls are available to adjust the speed of rendered notes.
 * These notes are rendered in a minimal style with minimal context present
 * in the footer.
 */
function ZenMode({ onClose = () => {} }: ZenModeProps) {
  // Data management
  const [queriesLoaded, setQueriesLoaded] = useState<boolean>(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [index, setIndex] = useState<number>(0) // 0 <= index < note.length

  // Playback management
  const intervalRef = useRef<number>(-1) // Required to cancel when pausing or during unmounting
  const [paused, setPaused] = useState<boolean>(false)
  const [speed, setSpeed] = useState<number>(10) // seconds

  const { config } = useContext(ConfigContext)

  // Utility function to move to the next note
  const moveToNextNote = () => {
    if (index + 1 === notes.length) {
      // Loop on notes
      // If < 1000, not useful to query again
      // If == 1000, the user is probably sleeping 😴
      setIndex(0)
    } else {
      setIndex(index + 1)
    }
  }

  // Load notes based on configuration
  useEffect(() => {
    const queries = extractQueries(config.static.zenMode)

    if (queries.length === 0) {
      setQueriesLoaded(true)
    }

    const msearch = async () => {
      const results: QueryResult[] = await window.api.msearch(queries)
      setQueriesLoaded(true)
      const foundNotes: Note[] = []
      for (const result of results) {
        foundNotes.push(...result.notes)
      }
      setNotes(foundNotes)
    }
    msearch()
  }, [config.static.zenMode])

  // Exit Zen Mode on pressing ESC
  useKeyDown(() => {
    onClose()
  }, ['Escape'])

  // Clear interval when component is unmounted
  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  // Render occurs when the user pauses/resumes or a new note must be displayed.
  // We systematically restart the countdown.
  if (intervalRef.current) {
    clearInterval(intervalRef.current)
  }
  // And start it only when not paused.
  if (!paused && notes.length > 0) {
    intervalRef.current = window.setInterval(() => {
      moveToNextNote()
    }, speed * 1000)
  }

  // The current note to display (in any)
  const note: Note | undefined = notes.length ? notes[index] : undefined

  return (
    <div className="Screen ZenMode">
      {/* Print an icon when no notes are found */}
      {queriesLoaded && !note && <SmileyXEyesIcon size={48} />}

      {queriesLoaded && note && (
        <>
          <Actions>
            {/* Make the timer the first icon to keep buttons at the same place even when the timer is hidden */}
            {!paused && (
              <Indicator>
                {/* Use a unique key to restart the countdown after every render */}
                <Timer key={getRandomInt()} duration={speed} />
              </Indicator>
            )}
            {!paused && (
              <Action icon={<PauseIcon />} title="Pause" onClick={() => setPaused(true)} />
            )}
            {paused && <Action icon={<PlayIcon />} title="Play" onClick={() => setPaused(false)} />}
            <Action icon={<StopIcon />} title="Exit Zen Mode" onClick={() => onClose()} />
            <Action
              icon={<PersonSimpleWalkIcon />}
              title="Speed down"
              onClick={() => setSpeed(speed * 2)}
            />
            <Action
              icon={<PersonSimpleRunIcon />}
              title="Speed up"
              onClick={() => setSpeed(Math.round(speed / 2))}
            />
          </Actions>
          <div className="Content">
            <FullScreenNote note={note} />
          </div>
        </>
      )}
    </div>
  )
}

type TimerProps = {
  size?: number
  duration?: number
}

/*
 * A minimal pure CSS timer displaying the remaining time as a pie.
 */
function Timer({ size = 16, duration = 10 }: TimerProps) {
  // Based on https://stackoverflow.com/a/69481301
  const style = {
    '--duration': duration,
    '--size': size
  } as React.CSSProperties
  return (
    <div className="Timer" style={style}>
      <div className="mask" />
    </div>
  )
}

export default ZenMode
